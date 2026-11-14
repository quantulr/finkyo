package main

import (
	"fmt"
	"strings"

	"github.com/egoist/mygo"
	"github.com/egoist/mygo/ui"
)

type viewerState struct {
	path          string
	loading       bool
	err           string
	pic           *ui.Bitmap
	width, height float32
}

func (v *viewerState) clear() {
	if v.path == "" {
		return
	}
	v.path = ""
	v.loading = false
	v.err = ""
	v.pic = nil
	v.width, v.height = 0, 0
}

func (a *app) viewerView(c *ui.Context, p string) {
	v := &a.viewer
	p = strings.Trim(p, "/")
	if v.path != p {
		a.loadViewer(p)
	}

	theme := c.Theme()
	ui.Column(c).Fill().Children(func() {
		ui.Row(c).Padding(10).Gap(8).AlignItems(ui.Center).Children(func() {
			back := iconButton(c, iconArrowLeft, "返回", "返回目录", false)
			if back.Clicked() {
				a.router.Push(browseRoute(parentOf(p)))
			}

			ui.Column(c).Grow(1).Children(func() {
				ui.Text(c, baseName(p)).SingleLine()
				if v.width > 0 {
					ui.Text(c, fmt.Sprintf("%.0f × %.0f", v.width, v.height)).
						FontSize(11).
						TextColor(theme.TextMuted)
				}
			})

			external := iconButton(c, iconExternal, "原图", "在新标签页打开原图", false)
			if external.Clicked() {
				_ = mygo.Shell.OpenExternal(rawURL(p))
			}
			download := iconButton(c, iconDownload, "下载", "下载文件", false)
			if download.Clicked() {
				_ = mygo.Shell.OpenExternal(downloadURL(p))
			}
		})

		ui.Box(c).Grow(1).Background(ui.Hex("#000000")).Children(func() {
			switch {
			case v.loading:
				ui.Column(c).Fill().Center().Children(func() {
					ui.Text(c, "加载中…").TextColor(ui.Hex("#ffffff"))
				})
			case v.err != "":
				ui.Column(c).Fill().Center().Gap(8).Children(func() {
					ui.Text(c, v.err).TextColor(ui.Hex("#ffffff"))
					if ui.Button(c, "下载文件").Clicked() {
						_ = mygo.Shell.OpenExternal(downloadURL(p))
					}
				})
			case v.pic != nil:
				ui.Image(c, v.pic).Fill().Fit(ui.Contain)
			}
		})
	})
}

func (a *app) loadViewer(p string) {
	v := &a.viewer
	v.path = p
	v.loading = true
	v.err = ""
	v.pic = nil
	v.width, v.height = 0, 0

	go func() {
		data, err := fetchBytes(rawURL(p))
		a.win.Update(func() {
			if v.path != p {
				return
			}
			v.loading = false
			if err != nil {
				v.err = err.Error()
				return
			}
			bitmap, err := ui.DecodeBitmap(data)
			if err != nil {
				v.err = "无法显示该图片，可下载后查看"
				return
			}
			v.pic = bitmap
			v.width, v.height = ui.ImageSize(bitmap)
		})
	}()
}
