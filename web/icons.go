package main

import "github.com/egoist/mygo/ui"

func svg(body string) *ui.SVG {
	const open = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">`
	return ui.MustParseSVG([]byte(open + body + `</svg>`))
}

var (
	iconFolder       = svg(`<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>`)
	iconFile         = svg(`<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>`)
	iconFileText     = svg(`<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>`)
	iconImage        = svg(`<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-4.5-4.5L7 20"/>`)
	iconVideo        = svg(`<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5v5l4-2.5z" fill="currentColor" stroke="none"/>`)
	iconMusic        = svg(`<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>`)
	iconArchive      = svg(`<path d="M4 7h16v13H4z"/><path d="M2 4h20v3H2z"/><path d="M10 11h4"/>`)
	iconArrowLeft    = svg(`<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>`)
	iconArrowUp      = svg(`<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>`)
	iconArrowDown    = svg(`<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>`)
	iconChevronRight = svg(`<path d="m9 6 6 6-6 6"/>`)
	iconRefresh      = svg(`<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>`)
	iconDownload     = svg(`<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 19h16"/>`)
	iconExternal     = svg(`<path d="M14 4h6v6"/><path d="m20 4-9 9"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>`)
	iconPlay         = svg(`<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>`)
	iconPause        = svg(`<path d="M9 5v14M15 5v14" stroke-width="3"/>`)
	iconPrev         = svg(`<path d="M19 5v14L8 12z" fill="currentColor" stroke="none"/><path d="M5 5v14"/>`)
	iconNext         = svg(`<path d="M5 5v14l11-7z" fill="currentColor" stroke="none"/><path d="M19 5v14"/>`)
	iconRepeat       = svg(`<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>`)
	iconList         = svg(`<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>`)
	iconGrid         = svg(`<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>`)
	iconHome         = svg(`<path d="m3 11 9-8 9 8"/><path d="M5 9v11h14V9"/>`)
	iconVolume       = svg(`<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>`)
	iconMute         = svg(`<path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 5 6M21 9l-5 6"/>`)
)
