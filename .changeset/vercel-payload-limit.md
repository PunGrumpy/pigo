---
"@pigo/core": patch
---

Lower MaxFileSize from 20 MB to 4 MB and add MaxOutputSize so uploads and results fit under the 4.5 MB body limit of Vercel Functions.
