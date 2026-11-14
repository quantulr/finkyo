package main

import (
	"sort"
	"strings"

	"github.com/egoist/mygo"
	"github.com/egoist/mygo/ui"
)

type sortMode int

const (
	sortByName sortMode = iota
	sortBySize
	sortByModified
)

type browseState struct {
	path      string
	loading   bool
	loaded    bool
	err       string
	entries   []Entry
	parent    *string
	query     string
	sort      sortMode
	desc      bool
	mode      int
	selected  int
	list      *ui.ListState
	grid      *ui.GridState
	thumbs    map[string]*ui.Bitmap
	thumbBusy map[string]bool
}

func (a *app) browseView(c *ui.Context, p string) {
	b := &a.browse
	p = strings.Trim(p, "/")
	if b.path != p || (!b.loading && !b.loaded && b.err == "") {
		a.loadBrowse(p)
	}

	ui.Column(c).Fill().Padding(12).Gap(8).Children(func() {
		a.browseToolbar(c)
		a.browseBreadcrumbs(c)
		switch {
		case b.loading:
			a.centeredMessage(c, "加载中…")
		case b.err != "":
			a.errorMessage(c, b.err, func() { a.loadBrowse(b.path) })
		default:
			a.browseContent(c)
		}
	})
}

func (a *app) loadBrowse(p string) {
	b := &a.browse
	p = strings.Trim(p, "/")
	b.path = p
	b.loading = true
	b.loaded = false
	b.err = ""
	b.entries = nil
	b.parent = nil
	b.selected = -1
	b.query = ""
	// A fresh state per directory: the page leaving the screen keeps its
	// own while the router animates it out.
	b.list = &ui.ListState{}
	b.grid = &ui.GridState{}

	go func() {
		result, err := fetchList(p)
		a.win.Update(func() {
			if b.path != p {
				return
			}
			b.loading = false
			if err != nil {
				b.err = err.Error()
				return
			}
			b.loaded = true
			b.entries = result.Entries
			b.parent = result.Parent
		})
	}()
}

func (a *app) browseToolbar(c *ui.Context) {
	b := &a.browse
	width, _ := c.Size()
	toolbar := ui.Row(c).Gap(6).AlignItems(ui.Center)
	if width < 760 {
		toolbar = toolbar.Wrap()
	}
	toolbar.Children(func() {
		back := iconButton(c, iconArrowLeft, "后退", "后退", !a.router.CanGoBack())
		if back.Clicked() {
			a.router.Back()
		}

		up := iconButton(c, iconArrowUp, "上一级", "上一级", b.path == "")
		if up.Clicked() {
			a.router.Push(browseRoute(parentOf(b.path)))
		}

		if ui.SearchField(c, &b.query).Placeholder("筛选当前目录").Grow(1).Changed() {
			b.selected = -1
		}

		labels := []string{"名称", "大小", "修改时间"}
		selected := labels[b.sort]
		if ui.Select(c, &selected, labels).Label("排序").Changed() {
			for i, label := range labels {
				if label == selected {
					b.sort = sortMode(i)
					break
				}
			}
		}

		direction := iconArrowUp
		description := "升序"
		if b.desc {
			direction = iconArrowDown
			description = "降序"
		}
		order := iconButton(c, direction, description, description, false)
		if order.Clicked() {
			b.desc = !b.desc
		}

		if ui.Segmented(c, &b.mode, "列表", "网格").Label("视图").Changed() {
			b.selected = -1
		}

		refresh := iconButton(c, iconRefresh, "刷新", "刷新", false)
		if refresh.Clicked() {
			a.loadBrowse(b.path)
		}
	})
}

func (a *app) browseBreadcrumbs(c *ui.Context) {
	b := &a.browse
	muted := c.Theme().TextMuted
	ui.Row(c).Gap(2).AlignItems(ui.Center).Wrap().Children(func() {
		ui.Link(c, "根目录", "/").FontSize(13)
		if b.path == "" {
			return
		}
		accumulated := ""
		for _, segment := range strings.Split(b.path, "/") {
			if segment == "" {
				continue
			}
			accumulated = joinPath(accumulated, segment)
			ui.Icon(c, iconChevronRight).FontSize(13).TextColor(muted)
			ui.Link(c, segment, browseRoute(accumulated)).FontSize(13)
		}
	})
}

func (a *app) browseContent(c *ui.Context) {
	b := &a.browse
	items := b.visibleEntries()
	if len(items) == 0 {
		message := "此目录为空"
		if strings.TrimSpace(b.query) != "" {
			message = "没有匹配的文件"
		}
		a.centeredMessage(c, message)
		return
	}

	if b.mode == 1 {
		a.browseGrid(c, items)
	} else {
		a.browseTable(c, items)
	}
}

func (a *app) browseTable(c *ui.Context, items []Entry) {
	b := &a.browse
	if b.list == nil {
		b.list = &ui.ListState{}
	}
	theme := c.Theme()
	width, _ := c.Size()

	b.list.Key = func(row int) any { return items[row].Name }
	b.list.Label = func(row int) string { return items[row].Name }
	b.list.Selected = &b.selected

	kinds := []int{0}
	columns := []ui.TableColumn{{Title: "名称"}}
	if width >= 480 {
		kinds = append(kinds, 1)
		columns = append(columns, ui.TableColumn{Title: "大小", Width: 90, Align: ui.End})
	}
	if width >= 720 {
		kinds = append(kinds, 2)
		columns = append(columns, ui.TableColumn{Title: "修改时间", Width: 150, Align: ui.End})
	}

	opened := -1
	table := ui.Table(c, b.list, columns, len(items), func(row, col int) {
		entry := items[row]
		cell := ui.Box(c).FillWidth()
		switch kinds[col] {
		case 0:
			cell.Children(func() {
				ui.Row(c).Gap(6).AlignItems(ui.Center).Children(func() {
					ui.Icon(c, entryIcon(entry)).FontSize(16).TextColor(theme.TextMuted)
					ui.Text(c, entry.Name).SingleLine()
				})
			})
		case 1:
			cell.Children(func() {
				ui.Text(c, humanSize(entry.Size)).TextColor(theme.TextMuted)
			})
		case 2:
			cell.Children(func() {
				ui.Text(c, formatTime(entry.Modified)).TextColor(theme.TextMuted)
			})
		}
		if cell.RowClicked() {
			opened = row
		}
	}).Grow(1)

	table.ContextMenu(func(menu *ui.Menu) {
		a.entryMenu(menu, items)
	})

	if opened >= 0 {
		a.openEntry(b.path, items[opened])
		return
	}
	if table.Submitted() && b.selected >= 0 && b.selected < len(items) {
		a.openEntry(b.path, items[b.selected])
	}
}

func (a *app) browseGrid(c *ui.Context, items []Entry) {
	b := &a.browse
	if b.grid == nil {
		b.grid = &ui.GridState{}
	}

	b.grid.Key = func(item int) any { return items[item].Name }
	b.grid.Label = func(item int) string { return items[item].Name }
	b.grid.Selected = &b.selected

	grid := ui.GridView(c, b.grid, len(items), 140, 140, func(item int) {
		a.gridItem(c, items[item])
	}).Grow(1)

	grid.ContextMenu(func(menu *ui.Menu) {
		a.entryMenu(menu, items)
	})

	if grid.Submitted() && b.selected >= 0 && b.selected < len(items) {
		a.openEntry(b.path, items[b.selected])
	}
}

func (a *app) gridItem(c *ui.Context, entry Entry) {
	b := &a.browse
	theme := c.Theme()

	ui.Column(c).Gap(4).OnClick(func() {
		a.openEntry(b.path, entry)
	}).Children(func() {
		ui.Box(c).Height(100).FillWidth().Radius(8).Background(theme.Surface).Children(func() {
			if isImageName(entry.Name) {
				full := joinPath(b.path, entry.Name)
				if bitmap := b.thumbs[full]; bitmap != nil {
					ui.Image(c, bitmap).Fill().Fit(ui.Contain).Radius(8)
					return
				}
				a.requestThumb(full)
				ui.Column(c).Fill().Center().Children(func() {
					ui.Icon(c, iconImage).FontSize(28).TextColor(theme.TextMuted)
				})
				return
			}
			ui.Column(c).Fill().Center().Children(func() {
				ui.Icon(c, entryIcon(entry)).FontSize(28).TextColor(theme.TextMuted)
			})
		})
		ui.Text(c, entry.Name).SingleLine().FontSize(12)
	})
}

func (a *app) requestThumb(full string) {
	b := &a.browse
	if b.thumbs[full] != nil || b.thumbBusy[full] {
		return
	}
	b.thumbBusy[full] = true

	go func() {
		data, err := fetchBytes(thumbURL(full, 320))
		a.win.Update(func() {
			delete(b.thumbBusy, full)
			if err != nil {
				return
			}
			bitmap, err := ui.DecodeBitmap(data)
			if err != nil {
				return
			}
			if len(b.thumbs) >= 300 {
				b.thumbs = map[string]*ui.Bitmap{}
			}
			b.thumbs[full] = bitmap
		})
	}()
}

func (a *app) entryMenu(menu *ui.Menu, items []Entry) {
	b := &a.browse
	if b.selected < 0 || b.selected >= len(items) {
		return
	}
	entry := items[b.selected]
	full := joinPath(b.path, entry.Name)

	if menu.Item("打开").Chosen() {
		a.openEntry(b.path, entry)
	}
	if isDirEntry(entry) {
		return
	}
	if menu.Item("下载").Chosen() {
		_ = mygo.Shell.OpenExternal(downloadURL(full))
	}
	if menu.Item("在新标签页打开").Chosen() {
		_ = mygo.Shell.OpenExternal(rawURL(full))
	}
}

func (b *browseState) visibleEntries() []Entry {
	entries := make([]Entry, 0, len(b.entries))
	query := strings.ToLower(strings.TrimSpace(b.query))
	for _, entry := range b.entries {
		if query != "" && !strings.Contains(strings.ToLower(entry.Name), query) {
			continue
		}
		entries = append(entries, entry)
	}

	sort.SliceStable(entries, func(i, j int) bool {
		left, right := entries[i], entries[j]
		leftDir, rightDir := isDirEntry(left), isDirEntry(right)
		if leftDir != rightDir {
			return leftDir
		}

		var order int
		switch b.sort {
		case sortBySize:
			order = compareInt64(left.Size, right.Size)
		case sortByModified:
			order = compareInt64(left.Modified, right.Modified)
		default:
			order = strings.Compare(strings.ToLower(left.Name), strings.ToLower(right.Name))
		}
		if b.desc {
			return order > 0
		}
		return order < 0
	})

	return entries
}

func compareInt64(left, right int64) int {
	switch {
	case left < right:
		return -1
	case left > right:
		return 1
	default:
		return 0
	}
}

func iconButton(c *ui.Context, icon *ui.SVG, label, tooltip string, disabled bool) ui.Element {
	button := ui.Button(c, "").Label(label).Tooltip(tooltip).Disabled(disabled)
	button.Children(func() {
		ui.Icon(c, icon).FontSize(18)
	})
	return button
}

func (a *app) centeredMessage(c *ui.Context, message string) {
	ui.Column(c).Fill().Center().Children(func() {
		ui.Text(c, message).TextColor(c.Theme().TextMuted)
	})
}

func (a *app) errorMessage(c *ui.Context, message string, retry func()) {
	ui.Column(c).Fill().Center().Gap(8).Children(func() {
		ui.Text(c, message).TextColor(c.Theme().Danger)
		if ui.Button(c, "重试").Clicked() {
			retry()
		}
	})
}
