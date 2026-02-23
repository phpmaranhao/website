package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

const (
	uploadDir       = "./uploads"
	dataDir         = "./submissions"
	maxPhotoSize    = 1 << 20  // 1 MB
	maxMaterialSize = 20 << 20 // 20 MB
	maxBodySize     = 22 << 20 // 20MB material + 1MB photo + form fields
	listenAddr      = ":8080"
)

// Set to false to stop accepting submissions
var acceptingSubmissions = true

var (
	emailRegex = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]{2,}$`)
	phoneRegex = regexp.MustCompile(`^\+?\d[\d\s\-()]{9,}$`)
	handleRe   = regexp.MustCompile(`^@[a-zA-Z0-9_]{5,32}$`)
)

type Submission struct {
	ID            string `json:"id"`
	Nome          string `json:"nome"`
	Email         string `json:"email"`
	Telefone      string `json:"telefone"`
	Cracha        string `json:"cracha"`
	Bio           string `json:"bio"`
	TipoAtividade string `json:"tipo_atividade"`
	Titulo        string `json:"titulo"`
	Resumo        string `json:"resumo"`
	Trilha        string `json:"trilha"`
	FotoPath      string `json:"foto_path,omitempty"`
	MaterialPath  string `json:"material_path,omitempty"`
	CreatedAt     string `json:"created_at"`
}

func main() {
	for _, dir := range []string{uploadDir, dataDir} {
		if err := os.MkdirAll(dir, 0755); err != nil {
			log.Fatalf("failed to create directory %s: %v", dir, err)
		}
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/submissions", handleSubmissions)
	mux.HandleFunc("/api/status", handleStatus)

	handler := corsMiddleware(mux)

	log.Printf("CFP API listening on %s", listenAddr)
	if err := http.ListenAndServe(listenAddr, handler); err != nil {
		log.Fatal(err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, http.StatusMethodNotAllowed, "método não permitido")
		return
	}

	w.Header().Set("Content-Type", "application/json")

	msg := "As submissões estão abertas! Envie sua proposta."
	if !acceptingSubmissions {
		msg = "As submissões estão encerradas. Obrigado a todos que participaram!"
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"accepting": acceptingSubmissions,
		"message":   msg,
	})
}

func handleSubmissions(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		handleCreateSubmission(w, r)
	case http.MethodGet:
		handleListSubmissions(w, r)
	default:
		jsonError(w, http.StatusMethodNotAllowed, "método não permitido")
	}
}

func handleCreateSubmission(w http.ResponseWriter, r *http.Request) {
	if !acceptingSubmissions {
		jsonError(w, http.StatusForbidden, "as submissões estão encerradas")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxBodySize)

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		jsonError(w, http.StatusBadRequest, "erro ao processar formulário: "+err.Error())
		return
	}
	defer r.MultipartForm.RemoveAll()

	// Validate required fields
	required := map[string]string{
		"nome":           "Nome completo",
		"email":          "E-mail",
		"telefone":       "Whatsapp / Telegram",
		"cracha":         "Nome para crachá",
		"bio":            "Mini bio",
		"tipo_atividade": "Tipo de atividade",
		"titulo":         "Título da atividade",
		"resumo":         "Resumo da atividade",
		"trilha":         "Trilha",
	}

	for field, label := range required {
		if strings.TrimSpace(r.FormValue(field)) == "" {
			jsonError(w, http.StatusBadRequest, fmt.Sprintf("campo obrigatório: %s", label))
			return
		}
	}

	// Validate email
	email := strings.TrimSpace(r.FormValue("email"))
	if !emailRegex.MatchString(email) {
		jsonError(w, http.StatusBadRequest, "e-mail inválido")
		return
	}

	// Validate phone/telegram
	telefone := strings.TrimSpace(r.FormValue("telefone"))
	if !isValidContact(telefone) {
		jsonError(w, http.StatusBadRequest, "informe um número com DDD (ex: 98991234567) ou um handler do Telegram (ex: @usuario)")
		return
	}

	// Validate tipo_atividade
	tipoValido := map[string]bool{"Palestra": true, "Minicurso": true, "Desafio estilo gincana": true}
	if !tipoValido[r.FormValue("tipo_atividade")] {
		jsonError(w, http.StatusBadRequest, "tipo de atividade inválido")
		return
	}

	// Validate trilha
	trilhaValida := map[string]bool{
		"Arquitetura": true, "Blockchain": true, "Carreira": true,
		"Escalabilidade": true, "IA": true, "Integração": true,
		"Observabilidade": true, "SaaS": true, "Segurança": true, "Testes": true,
	}
	if !trilhaValida[r.FormValue("trilha")] {
		jsonError(w, http.StatusBadRequest, "trilha inválida")
		return
	}

	id := fmt.Sprintf("%d", time.Now().UnixNano())

	sub := Submission{
		ID:            id,
		Nome:          strings.TrimSpace(r.FormValue("nome")),
		Email:         email,
		Telefone:      telefone,
		Cracha:        strings.TrimSpace(r.FormValue("cracha")),
		Bio:           strings.TrimSpace(r.FormValue("bio")),
		TipoAtividade: r.FormValue("tipo_atividade"),
		Titulo:        strings.TrimSpace(r.FormValue("titulo")),
		Resumo:        strings.TrimSpace(r.FormValue("resumo")),
		Trilha:        r.FormValue("trilha"),
		CreatedAt:     time.Now().Format(time.RFC3339),
	}

	// Handle photo upload
	if fotoPath, err := saveUpload(r, "foto", id, maxPhotoSize); err != nil {
		jsonError(w, http.StatusBadRequest, "erro no upload da foto: "+err.Error())
		return
	} else {
		sub.FotoPath = fotoPath
	}

	// Handle material upload
	if materialPath, err := saveUpload(r, "material", id, maxMaterialSize); err != nil {
		jsonError(w, http.StatusBadRequest, "erro no upload do material: "+err.Error())
		return
	} else {
		sub.MaterialPath = materialPath
	}

	// Save submission as JSON
	data, err := json.MarshalIndent(sub, "", "  ")
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "erro interno")
		return
	}

	filePath := filepath.Join(dataDir, id+".json")
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		jsonError(w, http.StatusInternalServerError, "erro ao salvar submissão")
		return
	}

	log.Printf("New submission: %s — %s (%s)", sub.Nome, sub.Titulo, sub.Trilha)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{
		"id":      id,
		"message": "Proposta recebida com sucesso!",
	})
}

func isValidContact(value string) bool {
	// Accept Telegram handle: @username
	if handleRe.MatchString(value) {
		return true
	}

	// Accept phone number: strip non-digits and check length
	digits := regexp.MustCompile(`\D`).ReplaceAllString(value, "")
	// Min 10 digits (DDD + number), max 13 (DDI + DDD + number)
	return len(digits) >= 10 && len(digits) <= 13
}

func handleListSubmissions(w http.ResponseWriter, r *http.Request) {
	entries, err := os.ReadDir(dataDir)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "erro ao listar submissões")
		return
	}

	submissions := make([]Submission, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}

		data, err := os.ReadFile(filepath.Join(dataDir, entry.Name()))
		if err != nil {
			continue
		}

		var sub Submission
		if err := json.Unmarshal(data, &sub); err != nil {
			continue
		}
		submissions = append(submissions, sub)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(submissions)
}

func saveUpload(r *http.Request, fieldName string, id string, maxSize int64) (string, error) {
	file, header, err := r.FormFile(fieldName)
	if err == http.ErrMissingFile {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("erro ao ler arquivo")
	}
	defer file.Close()

	if header.Size > maxSize {
		return "", fmt.Errorf("arquivo excede o tamanho máximo de %d MB", maxSize>>20)
	}

	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("%s_%s%s", id, fieldName, ext)
	destPath := filepath.Join(uploadDir, filename)

	dst, err := os.Create(destPath)
	if err != nil {
		return "", fmt.Errorf("erro ao salvar arquivo")
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		return "", fmt.Errorf("erro ao salvar arquivo")
	}

	return filename, nil
}

func jsonError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
