package router

import (
	"bytes"
	"encoding/json"
	"image"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/PunGrumpy/pigo/packages/core"
)

// multipartRequest builds a POST /compress request with an optional PNG
// file field ("file") and extra form fields. Pass fileBytes == nil to omit
// the file field entirely.
func multipartRequest(t *testing.T, fileBytes []byte, filename string, fields map[string]string) *http.Request {
	t.Helper()

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	if fileBytes != nil {
		part, err := writer.CreateFormFile("file", filename)
		if err != nil {
			t.Fatalf("failed to create form file: %v", err)
		}
		if _, err := part.Write(fileBytes); err != nil {
			t.Fatalf("failed to write form file: %v", err)
		}
	}

	for key, value := range fields {
		if err := writer.WriteField(key, value); err != nil {
			t.Fatalf("failed to write field %q: %v", key, err)
		}
	}

	if err := writer.Close(); err != nil {
		t.Fatalf("failed to close multipart writer: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/compress", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return req
}

func pngFixture(t *testing.T, width, height int) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("failed to encode png fixture: %v", err)
	}
	return buf.Bytes()
}

func decodeAPIError(t *testing.T, body []byte) apiError {
	t.Helper()
	var apiErr apiError
	if err := json.Unmarshal(body, &apiErr); err != nil {
		t.Fatalf("failed to decode error body %q: %v", body, err)
	}
	return apiErr
}

// requiredHeaders is the exact set of X-* headers apps/web/lib/image/headers.ts
// parses by name. Renaming any of these breaks the web client; any rename
// must change both sides.
var requiredHeaders = []string{
	"X-Original-Size",
	"X-Compressed-Size",
	"X-Elapsed-Ms",
	"X-Output-Format",
	"X-Width",
	"X-Height",
}

func TestHandleCompressHappyPath(t *testing.T) {
	fixture := pngFixture(t, 10, 10)
	req := multipartRequest(t, fixture, "input.png", nil)
	rec := httptest.NewRecorder()

	HandleCompress(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body=%s", rec.Code, http.StatusOK, rec.Body.String())
	}
	if got := rec.Header().Get("Content-Type"); got != "image/png" {
		t.Fatalf("got Content-Type %q, want %q", got, "image/png")
	}

	for _, name := range requiredHeaders {
		if got := rec.Header().Get(name); got == "" {
			t.Errorf("expected header %q to be present and non-empty", name)
		}
	}

	if got := rec.Header().Get("X-Width"); got != "10" {
		t.Errorf("got X-Width %q, want %q", got, "10")
	}
	if got := rec.Header().Get("X-Height"); got != "10" {
		t.Errorf("got X-Height %q, want %q", got, "10")
	}
	if got := rec.Header().Get("X-Output-Format"); got != "png" {
		t.Errorf("got X-Output-Format %q, want %q", got, "png")
	}
	if got := rec.Header().Get("X-Original-Size"); got != strconv.Itoa(len(fixture)) {
		t.Errorf("got X-Original-Size %q, want %q", got, strconv.Itoa(len(fixture)))
	}
}

func TestHandleCompressResizeReflectedInHeaders(t *testing.T) {
	fixture := pngFixture(t, 10, 10)
	req := multipartRequest(t, fixture, "input.png", map[string]string{
		"resizeWidth": "5",
	})
	rec := httptest.NewRecorder()

	HandleCompress(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body=%s", rec.Code, http.StatusOK, rec.Body.String())
	}
	if got := rec.Header().Get("X-Width"); got != "5" {
		t.Fatalf("got X-Width %q, want %q", got, "5")
	}
	if got := rec.Header().Get("X-Height"); got != "5" {
		t.Fatalf("got X-Height %q, want %q", got, "5")
	}
}

func TestHandleCompressMissingFile(t *testing.T) {
	req := multipartRequest(t, nil, "", nil)
	rec := httptest.NewRecorder()

	HandleCompress(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("got status %d, want %d; body=%s", rec.Code, http.StatusBadRequest, rec.Body.String())
	}
	apiErr := decodeAPIError(t, rec.Body.Bytes())
	want := `Multipart field "file" is required`
	if apiErr.Error != want {
		t.Fatalf("got error %q, want %q", apiErr.Error, want)
	}
}

func TestHandleCompressInvalidQuality(t *testing.T) {
	fixture := pngFixture(t, 10, 10)
	req := multipartRequest(t, fixture, "input.png", map[string]string{
		"quality": "0",
	})
	rec := httptest.NewRecorder()

	HandleCompress(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("got status %d, want %d; body=%s", rec.Code, http.StatusBadRequest, rec.Body.String())
	}
}

func TestHandleCompressWebpOutputRejected(t *testing.T) {
	fixture := pngFixture(t, 10, 10)
	req := multipartRequest(t, fixture, "input.png", map[string]string{
		"outputFormat": "webp",
	})
	rec := httptest.NewRecorder()

	HandleCompress(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("got status %d, want %d; body=%s", rec.Code, http.StatusBadRequest, rec.Body.String())
	}
	apiErr := decodeAPIError(t, rec.Body.Bytes())
	if apiErr.Error == "" {
		t.Fatalf("expected a non-empty browser-handled error message")
	}
}

func TestHandleCompressNonImagePayload(t *testing.T) {
	req := multipartRequest(t, []byte("this is not an image, just plain bytes"), "input.txt", nil)
	rec := httptest.NewRecorder()

	HandleCompress(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("got status %d, want %d; body=%s", rec.Code, http.StatusBadRequest, rec.Body.String())
	}
}

func TestHandleCompressBodyTooLarge(t *testing.T) {
	oversized := make([]byte, core.MaxFileSize+1)
	req := multipartRequest(t, oversized, "input.bin", nil)
	rec := httptest.NewRecorder()

	HandleCompress(rec, req)

	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("got status %d, want %d; body=%s", rec.Code, http.StatusRequestEntityTooLarge, rec.Body.String())
	}
}
