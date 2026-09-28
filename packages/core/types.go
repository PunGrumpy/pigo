package core

const (
	// Vercel Functions reject request and response bodies over 4.5 MB, so
	// both the upload and the encoded result must stay below it.
	MaxFileSize   = 4 << 20 // 4 MB
	MaxOutputSize = 4 << 20 // 4 MB
	MaxPixels     = 100_000_000
	MaxDimension  = 16_384

	// MaxUpscaleFactor bounds output pixels relative to source pixels so a
	// tiny upload cannot demand a huge render.
	MaxUpscaleFactor = 16
)

type CompressionOptions struct {
	OutputFormat   string
	Quality        int
	ResizeWidth    int
	ResizeHeight   int
	MaintainAspect bool
}
