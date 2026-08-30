package router

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/PunGrumpy/pigo/packages/core"
)

func HandleCompress(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	r.Body = http.MaxBytesReader(w, r.Body, core.MaxFileSize+1_048_576) // 1MB buffer

	if err := r.ParseMultipartForm(core.MaxFileSize); err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			writeError(w, http.StatusRequestEntityTooLarge, "File is too large")
			return
		}
		writeError(w, http.StatusBadRequest, "Multipart body is invalid")
		return
	}

	if r.Context().Err() != nil {
		return // client gone or deadline passed; chi's Timeout middleware owns the 504
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Multipart field \"file\" is required")
		return
	}
	defer file.Close()

	opts, err := core.ParseOptions(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	img, format, data, err := core.Decode(file)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, core.ErrFileTooLarge) {
			status = http.StatusRequestEntityTooLarge
		}
		writeError(w, status, err.Error())
		return
	}

	if r.Context().Err() != nil {
		return // client gone or deadline passed; chi's Timeout middleware owns the 504
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

	resizedImg, width, height, err := core.Resize(img, opts)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if r.Context().Err() != nil {
		return // client gone or deadline passed; chi's Timeout middleware owns the 504
	}

	out, contentType, err := core.Encode(resizedImg, outputFormat, opts.Quality)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to encode image")
		return
	}

	if r.Context().Err() != nil {
		return // client gone or deadline passed; chi's Timeout middleware owns the 504
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
