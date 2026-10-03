package utils

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
)

var ErrNotFound = errors.New("not found")

type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func SendErrorResponse(w http.ResponseWriter, statusCode int, code string, message string, err error) {
	if err != nil {
		slog.Error(err.Error())
	}

	if errors.Is(err, ErrNotFound) {
		statusCode = http.StatusNotFound
	}

	SendJSONResponse(w, statusCode, ErrorResponse{
		Code:    code,
		Message: message,
	})
}

func SendJSONResponse(w http.ResponseWriter, statusCode int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		slog.Error("failed to encode JSON response", "error", err)
	}
}
