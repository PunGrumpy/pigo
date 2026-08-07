package router

import (
	"bytes"
	"image"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"runtime"
	"sync"
	"testing"
)

// buildCompressRequestBody returns a ready-to-send multipart body and its
// Content-Type header value for a small PNG upload to /compress.
func buildCompressRequestBody(t *testing.T) (*bytes.Buffer, string) {
	t.Helper()

	img := image.NewRGBA(image.Rect(0, 0, 8, 8))
	var pngBuf bytes.Buffer
	if err := png.Encode(&pngBuf, img); err != nil {
		t.Fatalf("failed to encode png fixture: %v", err)
	}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", "input.png")
	if err != nil {
		t.Fatalf("failed to create form file: %v", err)
	}
	if _, err := part.Write(pngBuf.Bytes()); err != nil {
		t.Fatalf("failed to write form file: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("failed to close multipart writer: %v", err)
	}

	return &body, writer.FormDataContentType()
}

func TestRouterThrottlesCompressButNotHealth(t *testing.T) {
	srv := httptest.NewServer(New())
	defer srv.Close()

	maxConcurrent := max(2, runtime.GOMAXPROCS(0))
	n := maxConcurrent * 3

	var wg sync.WaitGroup
	statuses := make([]int, n)

	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()

			body, contentType := buildCompressRequestBody(t)
			req, err := http.NewRequest(http.MethodPost, srv.URL+"/compress", body)
			if err != nil {
				t.Errorf("failed to build request: %v", err)
				return
			}
			req.Header.Set("Content-Type", contentType)

			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				t.Errorf("request %d failed: %v", idx, err)
				return
			}
			defer resp.Body.Close()
			statuses[idx] = resp.StatusCode
		}(i)
	}
	wg.Wait()

	sawOK := false
	for _, status := range statuses {
		if status != http.StatusOK && status != http.StatusServiceUnavailable {
			t.Errorf("got status %d, want %d or %d", status, http.StatusOK, http.StatusServiceUnavailable)
		}
		if status == http.StatusOK {
			sawOK = true
		}
	}
	if !sawOK {
		t.Fatalf("expected at least one 200 among %d concurrent /compress requests, got statuses %v", n, statuses)
	}

	// /health must remain outside the throttle regardless of /compress load.
	healthResp, err := http.Get(srv.URL + "/health")
	if err != nil {
		t.Fatalf("GET /health failed: %v", err)
	}
	defer healthResp.Body.Close()
	if healthResp.StatusCode != http.StatusOK {
		t.Fatalf("got /health status %d, want %d", healthResp.StatusCode, http.StatusOK)
	}
}
