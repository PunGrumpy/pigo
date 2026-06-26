package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type apiError struct {
	Error string `json:"error"`
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, apiError{Error: message})
}

func handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func handleCompress(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	r.Body = http.MaxBytesReader(w, r.Body, maxFileSize+1_048_576) // 1MB buffer

	if err := r.ParseMultipartForm(maxFileSize); err != nil {
		writeError(w, http.StatusRequestEntityTooLarge, "File is too large or the multipart body is invalid")
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Multipart field \"file\" is required")
		return
	}
	defer file.Close()

	opts, err := parseOptions(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	img, format, data, err := decodeImage(file)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, errFileTooLarge) {
			status = http.StatusRequestEntityTooLarge
		}
		writeError(w, status, err.Error())
		return
	}

	outputFormat := opts.OutputFormat
	if outputFormat == "same" {
		outputFormat = format
	}
	if outputFormat == "webp" {
		writeError(w, http.StatusBadRequest, "webp output is handled in the browser; choose jpeg or png for the API")
		return
	}
	if outputFormat != "jpeg" && outputFormat != "png" {
		writeError(w, http.StatusBadRequest, "Output format must be \"same\", \"jpeg\", or \"png\"")
		return
	}

	resizedImg, width, height, err := maybeResize(img, opts)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	out, contentType, err := encodeImage(resizedImg, outputFormat, opts.Quality)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to encode image")
		return
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Original-Size", strconv.Itoa(len(data)))
	w.Header().Set("X-Compressed-Size", strconv.Itoa(len(out)))
	w.Header().Set("X-Elapsed-Ms", strconv.FormatInt(time.Since(start).Milliseconds(), 10))
	w.Header().Set("X-Output-Format", outputFormat)
	w.Header().Set("X-Width", strconv.Itoa(width))
	w.Header().Set("X-Height", strconv.Itoa(height))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(out)
}

func parseOptions(r *http.Request) (compressionOptions, error) {
	quality := 82 // 82% quality by default
	if value := strings.TrimSpace(r.FormValue("quality")); value != "" {
		parsed, err := strconv.Atoi(value)
		if err != nil || parsed < 1 || parsed > 100 {
			return compressionOptions{}, fmt.Errorf("Quality must be an integer from 1 to 100")
		}
		quality = parsed
	}

	outputFormat := strings.ToLower(strings.TrimSpace(r.FormValue("outputFormat")))
	if outputFormat == "" {
		outputFormat = "same"
	}
	if outputFormat != "same" && outputFormat != "jpeg" && outputFormat != "png" {
		return compressionOptions{}, fmt.Errorf("Output format must be \"same\", \"jpeg\", or \"png\"")
	}

	width, err := parseOptionalDimension(r.FormValue("resizeWidth"), "resizeWidth")
	if err != nil {
		return compressionOptions{}, err
	}
	height, err := parseOptionalDimension(r.FormValue("resizeHeight"), "resizeHeight")
	if err != nil {
		return compressionOptions{}, err
	}

	maintainAspect := true
	if value := strings.TrimSpace(r.FormValue("maintainAspect")); value != "" {
		parsed, err := strconv.ParseBool(value)
		if err != nil {
			return compressionOptions{}, fmt.Errorf("Maintain aspect ratio must be true or false")
		}
		maintainAspect = parsed
	}

	return compressionOptions{
		OutputFormat:   outputFormat,
		Quality:        quality,
		ResizeWidth:    width,
		ResizeHeight:   height,
		MaintainAspect: maintainAspect,
	}, nil
}

func parseOptionalDimension(value string, field string) (int, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0, nil
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 1 || parsed > maxDimension {
		return 0, fmt.Errorf("%s must be an integer from 1 to %d", field, maxDimension)
	}
	return parsed, nil
}
