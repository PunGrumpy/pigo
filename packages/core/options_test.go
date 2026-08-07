package core

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

func newFormRequest(t *testing.T, form url.Values) *http.Request {
	t.Helper()
	req := httptest.NewRequest("POST", "/", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	return req
}

func TestParseOptionsDefaults(t *testing.T) {
	req := newFormRequest(t, url.Values{})

	opts, err := ParseOptions(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	want := CompressionOptions{
		OutputFormat:   "same",
		Quality:        82,
		ResizeWidth:    0,
		ResizeHeight:   0,
		MaintainAspect: true,
	}
	if opts != want {
		t.Fatalf("got %+v, want %+v", opts, want)
	}
}

func TestParseOptionsQuality(t *testing.T) {
	tests := []struct {
		name    string
		value   string
		wantErr bool
	}{
		{name: "min ok", value: "1", wantErr: false},
		{name: "max ok", value: "100", wantErr: false},
		{name: "zero rejected", value: "0", wantErr: true},
		{name: "above max rejected", value: "101", wantErr: true},
		{name: "non-numeric rejected", value: "abc", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := newFormRequest(t, url.Values{"quality": {tt.value}})
			_, err := ParseOptions(req)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				if !strings.Contains(err.Error(), "quality") {
					t.Fatalf("expected error mentioning quality, got %q", err.Error())
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

func TestParseOptionsOutputFormat(t *testing.T) {
	tests := []struct {
		name    string
		value   string
		want    string
		wantErr bool
	}{
		{name: "jpeg ok", value: "jpeg", want: "jpeg"},
		{name: "png ok", value: "png", want: "png"},
		{name: "same ok", value: "same", want: "same"},
		{name: "case folded", value: "JPEG", want: "jpeg"},
		{name: "webp rejected", value: "webp", wantErr: true},
		{name: "gif rejected", value: "gif", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := newFormRequest(t, url.Values{"outputFormat": {tt.value}})
			opts, err := ParseOptions(req)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if opts.OutputFormat != tt.want {
				t.Fatalf("got outputFormat %q, want %q", opts.OutputFormat, tt.want)
			}
		})
	}
}

func TestParseOptionsResizeDimensions(t *testing.T) {
	tests := []struct {
		name      string
		field     string
		value     string
		wantErr   bool
		wantValue int
	}{
		{name: "width min ok", field: "resizeWidth", value: "1", wantValue: 1},
		{name: "width max ok", field: "resizeWidth", value: "16384", wantValue: 16384},
		{name: "width zero rejected", field: "resizeWidth", value: "0", wantErr: true},
		{name: "width above max rejected", field: "resizeWidth", value: "16385", wantErr: true},
		{name: "width negative rejected", field: "resizeWidth", value: "-5", wantErr: true},
		{name: "width fractional rejected", field: "resizeWidth", value: "1.5", wantErr: true},
		{name: "width empty unsets", field: "resizeWidth", value: "", wantValue: 0},
		{name: "width whitespace unsets", field: "resizeWidth", value: "  ", wantValue: 0},

		{name: "height min ok", field: "resizeHeight", value: "1", wantValue: 1},
		{name: "height max ok", field: "resizeHeight", value: "16384", wantValue: 16384},
		{name: "height zero rejected", field: "resizeHeight", value: "0", wantErr: true},
		{name: "height above max rejected", field: "resizeHeight", value: "16385", wantErr: true},
		{name: "height negative rejected", field: "resizeHeight", value: "-5", wantErr: true},
		{name: "height fractional rejected", field: "resizeHeight", value: "1.5", wantErr: true},
		{name: "height empty unsets", field: "resizeHeight", value: "", wantValue: 0},
		{name: "height whitespace unsets", field: "resizeHeight", value: "  ", wantValue: 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := newFormRequest(t, url.Values{tt.field: {tt.value}})
			opts, err := ParseOptions(req)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				if !strings.Contains(err.Error(), tt.field) {
					t.Fatalf("expected error naming field %q, got %q", tt.field, err.Error())
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			var got int
			if tt.field == "resizeWidth" {
				got = opts.ResizeWidth
			} else {
				got = opts.ResizeHeight
			}
			if got != tt.wantValue {
				t.Fatalf("got %s=%d, want %d", tt.field, got, tt.wantValue)
			}
		})
	}
}

func TestParseOptionsMaintainAspect(t *testing.T) {
	tests := []struct {
		name    string
		value   string
		want    bool
		wantErr bool
	}{
		{name: "true string", value: "true", want: true},
		{name: "false string", value: "false", want: false},
		{name: "one is true", value: "1", want: true},
		{name: "invalid rejected", value: "maybe", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := newFormRequest(t, url.Values{"maintainAspect": {tt.value}})
			opts, err := ParseOptions(req)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if opts.MaintainAspect != tt.want {
				t.Fatalf("got maintainAspect=%v, want %v", opts.MaintainAspect, tt.want)
			}
		})
	}
}
