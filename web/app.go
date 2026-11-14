package main

import (
	"fmt"
	"net/url"
	"path"
	"strings"
	"time"

	"github.com/egoist/mygo"
	"github.com/egoist/mygo/ui"
)

// app is the state a window's view is built from.
type app struct {
	win       *mygo.Window
	router    *ui.Router
	routePath string
	browse    browseState
	viewer    viewerState
	player    playerState
}

func newApp() *app {
	return &app{
		router: ui.NewRouter("/"),
		browse: browseState{
			selected:  -1,
			thumbs:    map[string]*ui.Bitmap{},
			thumbBusy: map[string]bool{},
		},
		player: playerState{
			volume: 1,
			rate:   1,
			loop:   false,
		},
	}
}

func (a *app) view(c *ui.Context) {
	a.syncRoute()
	a.router.View(c, func(r *ui.Route) {
		switch {
		case r.Match("/"):
			r.Title("finkyo")
			a.browseView(c, "")
		case r.Match("/browse/{path...}"):
			r.Title("finkyo")
			a.browseView(c, r.Param("path"))
		case r.Match("/view/{path...}"):
			p := r.Param("path")
			r.Title(path.Base(strings.TrimSuffix(p, "/")) + " - finkyo")
			a.viewerView(c, p)
		case r.Match("/play/{path...}"):
			p := r.Param("path")
			r.Title(path.Base(strings.TrimSuffix(p, "/")) + " - finkyo")
			a.playerView(c, p)
		default:
			ui.Column(c).Fill().Center().Children(func() {
				ui.Text(c, "页面不存在")
			})
		}
	})
}

// syncRoute closes page state that the route left.
func (a *app) syncRoute() {
	current := a.router.Path()
	if current == a.routePath {
		return
	}
	a.routePath = current
	if !strings.HasPrefix(current, "/play/") {
		a.player.close()
	}
	if !strings.HasPrefix(current, "/view/") {
		a.viewer.clear()
	}
}

func escapePath(p string) string {
	p = strings.Trim(p, "/")
	if p == "" {
		return ""
	}
	segments := strings.Split(p, "/")
	for i := range segments {
		segments[i] = url.PathEscape(segments[i])
	}
	return strings.Join(segments, "/")
}

func browseRoute(p string) string {
	encoded := escapePath(p)
	if encoded == "" {
		return "/"
	}
	return "/browse/" + encoded
}

func viewRoute(p string) string {
	return "/view/" + escapePath(p)
}

func playRoute(p string) string {
	return "/play/" + escapePath(p)
}

func joinPath(base, name string) string {
	if base == "" {
		return name
	}
	return base + "/" + name
}

func parentOf(p string) string {
	p = strings.Trim(p, "/")
	if p == "" {
		return ""
	}
	parent := path.Dir(p)
	if parent == "." || parent == "/" {
		return ""
	}
	return parent
}

func baseName(p string) string {
	p = strings.Trim(p, "/")
	if p == "" {
		return "根目录"
	}
	return path.Base(p)
}

func isDirEntry(entry Entry) bool {
	return entry.Type == "directory" || entry.Type == "symlinkDir"
}

func extensionOf(name string) string {
	return strings.ToLower(strings.TrimPrefix(path.Ext(name), "."))
}

var imageExtensions = map[string]bool{
	"jpg": true, "jpeg": true, "png": true, "gif": true, "webp": true,
	"bmp": true, "avif": true, "tif": true, "tiff": true,
}

var videoExtensions = map[string]bool{
	"mp4": true, "m4v": true, "mov": true, "webm": true, "mkv": true,
	"avi": true, "ogv": true, "ts": true, "m3u8": true,
}

var audioExtensions = map[string]bool{
	"mp3": true, "m4a": true, "aac": true, "flac": true, "ogg": true,
	"oga": true, "opus": true, "wav": true, "wma": true,
}

var textExtensions = map[string]bool{
	"txt": true, "md": true, "json": true, "toml": true, "yaml": true,
	"yml": true, "rs": true, "go": true, "js": true, "ts": true, "tsx": true,
	"jsx": true, "css": true, "html": true, "xml": true, "csv": true,
	"log": true, "ini": true, "conf": true, "sh": true, "py": true,
}

var archiveExtensions = map[string]bool{
	"zip": true, "tar": true, "gz": true, "tgz": true, "bz2": true,
	"xz": true, "7z": true, "rar": true, "zst": true,
}

func isImageName(name string) bool {
	return imageExtensions[extensionOf(name)]
}

func isVideoName(name string) bool {
	return videoExtensions[extensionOf(name)]
}

func isAudioName(name string) bool {
	return audioExtensions[extensionOf(name)]
}

func mediaKind(name string) string {
	if isVideoName(name) {
		return "video"
	}
	if isAudioName(name) {
		return "audio"
	}
	return ""
}

func entryIcon(entry Entry) *ui.SVG {
	if isDirEntry(entry) {
		return iconFolder
	}
	extension := extensionOf(entry.Name)
	switch {
	case imageExtensions[extension]:
		return iconImage
	case videoExtensions[extension]:
		return iconVideo
	case audioExtensions[extension]:
		return iconMusic
	case textExtensions[extension]:
		return iconFileText
	case archiveExtensions[extension]:
		return iconArchive
	default:
		return iconFile
	}
}

func (a *app) openEntry(directory string, entry Entry) {
	full := joinPath(directory, entry.Name)
	switch {
	case isDirEntry(entry):
		a.router.Push(browseRoute(full))
	case isImageName(entry.Name):
		a.router.Push(viewRoute(full))
	case mediaKind(entry.Name) != "":
		a.router.Push(playRoute(full))
	default:
		_ = mygo.Shell.OpenExternal(rawURL(full))
	}
}

func humanSize(size int64) string {
	if size <= 0 {
		return "—"
	}
	units := []string{"B", "KB", "MB", "GB", "TB"}
	value := float64(size)
	index := 0
	for value >= 1024 && index < len(units)-1 {
		value /= 1024
		index++
	}
	if index == 0 {
		return fmt.Sprintf("%d B", size)
	}
	return fmt.Sprintf("%.1f %s", value, units[index])
}

func formatTime(milliseconds int64) string {
	if milliseconds <= 0 {
		return "—"
	}
	return time.UnixMilli(milliseconds).Format("2006-01-02 15:04")
}
