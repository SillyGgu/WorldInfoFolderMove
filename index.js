import { debounce } from '../../../../scripts/utils.js';
import { Popup } from '../../../../scripts/popup.js';
import { showWorldEditor, world_names, loadWorldInfo } from '../../../../scripts/world-info.js';
import { eventSource, event_types } from '../../../../script.js';
import { accountStorage } from '../../../../scripts/util/AccountStorage.js';

const EXT_NAME = 'WorldInfoFolderMove';
const LOG_PREFIX = `[${EXT_NAME}]`;
const logger = {
    log: (...args) => console.log(LOG_PREFIX, ...args),
    error: (...args) => console.error(LOG_PREFIX, ...args),
    warn: (...args) => console.warn(LOG_PREFIX, ...args),
    debug: (...args) => console.debug(LOG_PREFIX, ...args),
};

const WIFM_UI_HTML = `
<div id="wifm-world-info-redesign" class="wifm-extension wifm-world-info-container">

    <div id="wifm-main-toolbar">
        <div id="wifm-explorer-toggle-btn" class="menu_button interactable" title="Open Folder Explorer">
            <i class="fa-solid fa-folder-open"></i>&nbsp;Folders
        </div>
        <div id="wifm-world-info-new-button" class="menu_button menu_button_icon fa-solid fa-file-circle-plus interactable" title="Create New World Info"></div>
        <div id="wifm-world-info-import-button" class="menu_button menu_button_icon fa-solid fa-file-import interactable" title="Import World Info"></div>

        <div style="flex-grow: 1;"></div>

        <div id="wifm-global-toggle-btn" class="menu_button interactable" style="display:none; margin-right:5px;" title="글로벌 월드인포로 지정">
            <i class="fa-solid fa-globe"></i>&nbsp;<span id="wifm-global-toggle-text">Activate</span>
        </div>

        <div id="wifm-current-wi-display">
            <i class="fa-solid fa-book-open" style="opacity:0.5; margin-right:4px;"></i>
            <span id="wifm-selected-lorebook-name" style="font-weight:bold;">None</span>
        </div>
    </div>

    <div id="wifm-folder-explorer-window">
        <div class="wifm-explorer-header">
            <div id="wifm-explorer-back-btn" class="menu_button menu_button_icon fa-solid fa-arrow-up interactable" title="Go Up"></div>
            <div id="wifm-explorer-breadcrumb" class="wifm-breadcrumb-path">Home</div>
            <div id="wifm-explorer-settings-btn" class="menu_button menu_button_icon fa-solid fa-gear interactable" title="Explorer Settings"></div>
            <div id="wifm-explorer-close-btn" class="menu_button menu_button_icon fa-solid fa-xmark interactable" title="Close"></div>
        </div>

        <div class="wifm-explorer-toolbar">
            <div id="wifm-world-info-new-folder" class="menu_button menu_button_icon fa-solid fa-folder-plus interactable" title="New Folder"></div>
            <div id="wifm-world-info-delete-folder" class="menu_button menu_button_icon fa-solid fa-folder-minus interactable" title="Delete Current Folder"></div>
            <div class="wifm-toolbar-sep"></div>
            <div class="wifm-toolbar-sep"></div>
            <div id="wifm-move-toggle-button" class="menu_button menu_button_icon fa-solid fa-arrows-up-down-left-right interactable" title="Move Mode"></div>
            <div id="wifm-move-actions" style="display:none; align-items:center; gap:4px;">
                <button id="wifm-move-confirm-button" class="menu_button greenBG">이동</button>
                <button id="wifm-move-cancel-button" class="menu_button redWarningBG">취소</button>
            </div>
            <div style="flex-grow:1;"></div>
            <input type="search" id="wifm-explorer-search" class="text_pole" style="height:26px; width:110px;" placeholder="Filter...">
        </div>

        <div id="wifm-explorer-body" class="wifm-explorer-body"></div>

        <div id="wifm-explorer-settings-view">
            <div class="wifm-settings-header">Explorer Settings</div>
            <div class="wifm-setting-row">
                <label>Icon/Text Size</label>
                <div style="display:flex; align-items:center; gap:5px;">
                    <input type="range" min="0.8" max="1.5" step="0.1" id="wifm-setting-scale-input">
                    <span class="wifm-slider-val" id="wifm-setting-scale-val">1.0x</span>
                </div>
            </div>
            <div class="wifm-setting-row">
                <label>Light Theme</label>
                <input type="checkbox" id="wifm-setting-theme-input">
            </div>
            <div id="wifm-settings-close-internal" class="menu_button interactable">
                <i class="fa-solid fa-check"></i>&nbsp;Done
            </div>
        </div>

        <div id="wifm-move-target-view">
            <div class="wifm-overlay-header" id="wifm-move-target-header">Move to...</div>
            <div id="wifm-move-target-list" class="wifm-folder-list"></div>
            <div id="wifm-move-target-cancel" class="menu_button interactable redWarningBG">
                <i class="fa-solid fa-xmark"></i>&nbsp;Cancel
            </div>
        </div>
    </div>

    <div class="navigator-body">
        <div id="wifm-world-info-panels-wrapper">
            <div id="wifm-world-info-entries-panel" class="wifm-world-info-panel active">
                <div class="wifm-panel-content-wrapper" style="height:100%;">
                    <div class="wifm-world-info-entries-header">
                        <div id="wifm-world-info-entry-new"        class="menu_button menu_button_icon fa-solid fa-plus interactable"           title="New Entry"></div>
                        <div id="wifm-world-info-entry-rename"     class="menu_button menu_button_icon fa-solid fa-pencil interactable"         title="Rename Lorebook"></div>
                        <div id="wifm-world-info-entry-duplicate"  class="menu_button menu_button_icon fa-solid fa-paste interactable"          title="Duplicate Lorebook"></div>
                        <div id="wifm-world-info-entry-export"     class="menu_button menu_button_icon fa-solid fa-file-export interactable"    title="Export Lorebook"></div>
                        <div id="wifm-world-info-entry-delete"     class="menu_button menu_button_icon fa-solid fa-trash-can redWarningBG interactable" title="Delete Lorebook"></div>
                        <div class="wifm-toolbar-sep"></div>
                        <div id="wifm-world-info-entry-open-all"   class="menu_button menu_button_icon fa-solid fa-expand interactable"         title="Open all Entries"></div>
                        <div id="wifm-world-info-entry-close-all"  class="menu_button menu_button_icon fa-solid fa-compress interactable"       title="Close all Entries"></div>
                        <div id="wifm-world-info-entry-fill-memos" class="menu_button menu_button_icon fa-solid fa-notes-medical interactable"  title="Fill empty Memo/Titles"></div>
                        <div id="wifm-world-info-entry-apply-sort" class="menu_button menu_button_icon fa-solid fa-arrow-down-9-1 interactable" title="Apply current sorting"></div>
                        <div id="wibm_bulk_move_wi_entries" class="interactable" style="display:none;"></div>
                        <div style="margin-left:auto; display:flex; align-items:center; gap:4px;">
                            <div id="wifm-world-info-entry-search-toggle" class="menu_button menu_button_icon fa-solid fa-magnifying-glass interactable" title="Search Entries"></div>
                            <select id="wifm-world-info-entry-sort" class="text_pole margin0"></select>
                            <div id="wifm-world-info-entry-refresh" class="menu_button menu_button_icon fa-solid fa-arrows-rotate interactable" title="Refresh"></div>
                        </div>
                    </div>
                    <div id="wifm-entry-search-bar-container" style="display:none; padding-bottom:5px;">
                        <input type="search" class="text_pole textarea_compact" id="wifm-world-info-entry-search" placeholder="Search entries...">
                    </div>
                    <div id="wifm-active-world-info-list" class="block_panel" style="margin-bottom:8px; font-size:0.8em; padding:4px 8px;">
                        <i class="fa-solid fa-circle-check" style="opacity:0.6; margin-right:4px;"></i>
                        <strong>Activated:</strong> <span id="wifm-active-list-content">None</span>
                    </div>
                    <div id="world_info_pagination" class="pagination-container"></div>
                    <div id="world_popup_entries_list" class="list-group" style="flex-grow:1; overflow-y:auto;"></div>
                    <div id="wifm-editor-placeholder"></div>
                </div>
            </div>

            <div id="wifm-world-info-settings-panel" class="wifm-world-info-panel">
                <div class="wifm-panel-content-wrapper">
                    <div id="wifm-activation-settings-fold" class="wifm-foldable-container">
                        <div class="wifm-foldable-header menu_button" style="width:100%; box-sizing:border-box;">
                            <span class="wifm-foldable-toggle">▶</span>
                            <span>World Info 통합 설정</span>
                        </div>
                        <div class="wifm-foldable-content">
                            <div id="wifm-settings-placeholder"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
`;

const WorldInfoFolderMove = {
    _currentWorldName: null,
    _selectedItems: new Set(),
    _uiInjected: false,
    _isDeselecting: false,
    _listenersRegistered: false,
    isMoveMode: false,
    folderState: {},
    explorerSettings: { scale: 1.0, lightTheme: false },
    storageKey: 'wifm-wi-folder-state',
    settingsKey: 'wifm-wi-explorer-settings',
    _currentPath: [],
    isExplorerOpen: false,

    init: async function() {
        this.loadFolderState();
        await this.injectUI();
        this.setupEventListeners();
        this._uiInjected = true;
        this.refreshLorebookUI();
        this.applyExplorerSettings();
        this.updateSelectedLorebookName(null);
    },

    injectUI: async function() {
        logger.log('UI 주입');
        try {
            const originalPanel = document.getElementById('WorldInfo');
            if (!originalPanel) return;

            const worldPopup = document.getElementById('world_popup');
            if (worldPopup) {
                worldPopup.style.display = 'none';
                document.body.appendChild(worldPopup);
            }

            const wiActivationSettings = document.getElementById('wiActivationSettings');
            if (wiActivationSettings) {
                wiActivationSettings.style.display = 'none';
                document.body.appendChild(wiActivationSettings);
            }

            const worldInfoSelect = document.getElementById('world_info');
            if (worldInfoSelect) {
                const container = worldInfoSelect.closest('.range-block') || worldInfoSelect.parentElement;
                if (container) {
                    container.style.display = 'none';
                    document.body.appendChild(container);
                }
            }

            originalPanel.innerHTML = WIFM_UI_HTML;

            const targetSettingsContent = document.querySelector('#wifm-activation-settings-fold .wifm-foldable-content');
            const savedSettings = document.getElementById('wiActivationSettings');
            if (targetSettingsContent && savedSettings) {
                targetSettingsContent.appendChild(savedSettings);
                savedSettings.style.display = '';
            }

            const entriesListContainer = document.getElementById('world_popup_entries_list');
            const editorContainer = document.getElementById('world_info_entry_editor_container');
            if (entriesListContainer && editorContainer) {
                entriesListContainer.after(editorContainer);
                editorContainer.style.display = '';
            }

            const wifmSort = document.getElementById('wifm-world-info-entry-sort');
            const originalSort = document.getElementById('world_info_sort_order');
            if (wifmSort && originalSort) {
                wifmSort.innerHTML = '';
                Array.from(originalSort.options).forEach(opt => wifmSort.add(opt.cloneNode(true)));
                wifmSort.value = originalSort.value;
            }

        } catch (error) {
            logger.error('UI 주입 오류', error);
        }
    },

    setupEntryManagementListeners: function() {
        const routeClick = (newId, oldId) => {
            const newBtn = document.getElementById(newId);
            const oldBtn = document.getElementById(oldId);
            if (newBtn && oldBtn) newBtn.addEventListener('click', () => oldBtn.click());
        };

        routeClick('wifm-world-info-entry-new',        'world_popup_new');
        routeClick('wifm-world-info-entry-rename',     'world_popup_name_button');
        routeClick('wifm-world-info-entry-duplicate',  'world_duplicate');
        routeClick('wifm-world-info-entry-export',     'world_popup_export');
        routeClick('wifm-world-info-entry-delete',     'world_popup_delete');
        routeClick('wifm-world-info-entry-open-all',   'OpenAllWIEntries');
        routeClick('wifm-world-info-entry-close-all',  'CloseAllWIEntries');
        routeClick('wifm-world-info-entry-fill-memos', 'world_backfill_memos');
        routeClick('wifm-world-info-entry-apply-sort', 'world_apply_current_sorting');
        routeClick('wifm-world-info-entry-refresh',    'world_refresh');

        // bulk move 버튼
        const bulkMove = document.getElementById('wibm_bulk_move_wi_entries');
        const entriesHeader = document.querySelector('.wifm-world-info-entries-header');
        if (bulkMove && entriesHeader) {
            bulkMove.className = 'menu_button menu_button_icon fa-solid fa-boxes-packing interactable';
            bulkMove.style.display = '';
            const sep = entriesHeader.querySelector('.wifm-toolbar-sep');
            if (sep) sep.after(bulkMove);
            else entriesHeader.appendChild(bulkMove);
        }

        // 검색 토글
        const searchToggleBtn    = document.getElementById('wifm-world-info-entry-search-toggle');
        const searchBarContainer = document.getElementById('wifm-entry-search-bar-container');
        const wifmEntrySearch    = document.getElementById('wifm-world-info-entry-search');
        const originalEntrySearch = document.getElementById('world_info_search');

        if (searchToggleBtn && searchBarContainer) {
            searchToggleBtn.addEventListener('click', () => {
                const isHidden = searchBarContainer.style.display === 'none';
                searchBarContainer.style.display = isHidden ? 'block' : 'none';
                if (isHidden && wifmEntrySearch) wifmEntrySearch.focus();
            });
        }
        if (wifmEntrySearch && originalEntrySearch) {
            wifmEntrySearch.addEventListener('input', () => {
                originalEntrySearch.value = wifmEntrySearch.value;
                $(originalEntrySearch).trigger('input');
            });
        }

        // sort
        const wifmSort    = document.getElementById('wifm-world-info-entry-sort');
        const originalSort = document.getElementById('world_info_sort_order');
        if (wifmSort && originalSort) {
            wifmSort.addEventListener('change', () => {
                originalSort.value = wifmSort.value;
                $(originalSort).trigger('change');
            });
        }
    },

    setupEventListeners: function() {
        document.getElementById('wifm-explorer-toggle-btn').addEventListener('click', () => this.toggleExplorer());
        document.getElementById('wifm-global-toggle-btn').addEventListener('click', () => this.toggleCurrentGlobalStatus());
        document.getElementById('wifm-explorer-close-btn').addEventListener('click', () => this.toggleExplorer(false));

        const currentWiDisplay = document.getElementById('wifm-current-wi-display');
        if (currentWiDisplay) {
            currentWiDisplay.addEventListener('click', () => {
                if (this._currentWorldName) this.deselectCurrentLorebook();
            });
        }

        document.getElementById('wifm-explorer-settings-btn')?.addEventListener('click', () => this.toggleSettingsView());
        document.getElementById('wifm-settings-close-internal')?.addEventListener('click', () => this.toggleSettingsView(false));
        document.getElementById('wifm-move-target-cancel')?.addEventListener('click', () => {
            document.getElementById('wifm-move-target-view').classList.remove('visible');
        });

        const scaleInput = document.getElementById('wifm-setting-scale-input');
        const themeInput = document.getElementById('wifm-setting-theme-input');
        if (scaleInput) {
            scaleInput.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                document.getElementById('wifm-setting-scale-val').textContent = val + 'x';
                this.explorerSettings.scale = val;
                this.applyExplorerSettings();
                this.saveExplorerSettings();
            });
        }
        if (themeInput) {
            themeInput.addEventListener('change', (e) => {
                this.explorerSettings.lightTheme = e.target.checked;
                this.applyExplorerSettings();
                this.saveExplorerSettings();
            });
        }

        document.getElementById('wifm-explorer-back-btn').addEventListener('click', () => {
            if (this._currentPath.length > 0) {
                this._currentPath.pop();
                this.renderExplorerView();
            }
        });

        document.getElementById('wifm-move-toggle-button').addEventListener('click', () => this.toggleMoveMode());
        document.getElementById('wifm-move-cancel-button').addEventListener('click', () => this.toggleMoveMode(false));
        document.getElementById('wifm-move-confirm-button').addEventListener('click', () => this.showFolderMovePopup());
        document.getElementById('wifm-world-info-new-folder').addEventListener('click', () => this.createNewFolder());
        document.getElementById('wifm-world-info-delete-folder').addEventListener('click', () => this.deleteCurrentFolder());

        document.getElementById('wifm-world-info-new-button').addEventListener('click', () => {
            document.getElementById('world_create_button')?.click();
        });
        document.getElementById('wifm-world-info-import-button').addEventListener('click', () => {
            document.getElementById('world_import_button')?.click();
        });

        this.setupEntryManagementListeners();

        // foldable header
        const foldHeader = document.querySelector('#wifm-activation-settings-fold .wifm-foldable-header');
        if (foldHeader) {
            const newHeader = foldHeader.cloneNode(true);
            foldHeader.parentNode.replaceChild(newHeader, foldHeader);
            newHeader.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('wifm-activation-settings-fold').classList.toggle('open');
            });
        }

        const explorerSearch = document.getElementById('wifm-explorer-search');
        if (explorerSearch) {
            explorerSearch.addEventListener('input', debounce(() => this.renderExplorerView(explorerSearch.value), 300));
        }

        // ST 이벤트 리스너 (중복 방지)
        if (!this._listenersRegistered) {
            this._listenersRegistered = true;
            const debouncedRefresh = debounce(() => this.refreshLorebookUI(), 150);
            eventSource.on(event_types.WORLD_INFO_LOADED, debouncedRefresh);
            eventSource.on(event_types.SETTINGS_UPDATED, debouncedRefresh);
            eventSource.on(event_types.WORLD_INFO_UPDATED, debouncedRefresh);
        }

        // world_editor_select change → 우리 UI 갱신
        // ST 코어가 rename/delete 후 이 select에 trigger('change')를 쏨
        const coreEditorSelect = document.getElementById('world_editor_select');
        if (coreEditorSelect) {
            $(coreEditorSelect).on('change', () => {
                if (this._isDeselecting) return;
                // ST 코어 자체 핸들러가 먼저 실행된 뒤 우리가 처리
                setTimeout(() => {
                    const sel = document.getElementById('world_editor_select');
                    if (!sel) return;
                    const opt = sel.options[sel.selectedIndex];
                    const name = (opt && opt.value !== '' && opt.text && !opt.text.includes('Pick to Edit')) ? opt.text : null;
                    if (name) {
                        this._currentWorldName = name;
                        this.updateSelectedLorebookName(name);
                    } else {
                        this._currentWorldName = null;
                        this.updateSelectedLorebookName(null);
                        document.getElementById('world_popup_entries_list').innerHTML = '';
                        document.getElementById('world_info_pagination').innerHTML = '';
                    }
                    this.updateGlobalButtonState();
                    this.updateActiveWorldInfoList();
                    this.renderExplorerView();
                }, 100);
            });
        }

        // displayWorldEntries 오버라이드 — 로어북 로드/unload 시 우리 UI 갱신
        if (window.displayWorldEntries) {
            const originalDisplay = window.displayWorldEntries;
            window.displayWorldEntries = async function(name, data, ...args) {
                const result = await originalDisplay.apply(this, [name, data, ...args]);
                if (WorldInfoFolderMove._isDeselecting) return result;
                if (name) {
                    WorldInfoFolderMove._currentWorldName = name;
                    WorldInfoFolderMove.updateSelectedLorebookName(name);
                } else {
                    WorldInfoFolderMove._currentWorldName = null;
                    WorldInfoFolderMove.updateSelectedLorebookName(null);
                }
                WorldInfoFolderMove.updateGlobalButtonState();
                WorldInfoFolderMove.updateActiveWorldInfoList();
                WorldInfoFolderMove.renderExplorerView();
                return result;
            };
        }
    },

    toggleExplorer: function(forceState) {
        const win = document.getElementById('wifm-folder-explorer-window');
        this.isExplorerOpen = forceState !== undefined ? forceState : !this.isExplorerOpen;
        if (this.isExplorerOpen) {
            win.classList.add('visible');
            this.renderExplorerView();
        } else {
            win.classList.remove('visible');
        }
    },

    refreshLorebookUI: function() {
        if (!this._uiInjected) return;
        const searchInput = document.getElementById('wifm-explorer-search');
        const currentSearch = (searchInput && searchInput.value.trim() !== '') ? searchInput.value : null;
        this.renderExplorerView(currentSearch);
        this.updateActiveWorldInfoList();
        this.updateGlobalButtonState();
    },

    deselectCurrentLorebook: function() {
        this._isDeselecting = true;
        this._currentWorldName = null;
        this.updateSelectedLorebookName(null);
        this.updateGlobalButtonState();
        this.updateActiveWorldInfoList();

        const coreSelect = document.getElementById('world_editor_select');
        if (coreSelect) {
            coreSelect.selectedIndex = 0; 
            $(coreSelect).trigger('change');
        }

        document.getElementById('world_popup_entries_list').innerHTML = '';
        document.getElementById('world_info_pagination').innerHTML = '';

        this._isDeselecting = false;
        this.renderExplorerView();
        logger.log('Lorebook selection cleared.');
    },

    loadLorebook: async function(name) {
        try {
            await showWorldEditor(name);
        } catch (error) {
            logger.error('loadLorebook 오류:', error);
        }
    },

    renderExplorerView: function(searchTerm = null) {
        const container = document.getElementById('wifm-explorer-body');
        const breadcrumb = document.getElementById('wifm-explorer-breadcrumb');
        const backBtn = document.getElementById('wifm-explorer-back-btn');
        if (!container) return;

        const delBtn = document.getElementById('wifm-world-info-delete-folder');
        if (delBtn) {
            const currentFolder = this._currentPath.length > 0 ? this._currentPath[this._currentPath.length - 1] : null;
            const isDeletable = currentFolder && currentFolder !== 'Unassigned';
            delBtn.style.opacity = isDeletable ? '1' : '0.4';
            delBtn.style.pointerEvents = isDeletable ? 'auto' : 'none';
        }

        container.innerHTML = '';

        const pathStr = this._currentPath.length === 0 ? 'Home' : 'Home > ' + this._currentPath.join(' > ');
        if (breadcrumb) breadcrumb.textContent = pathStr;
        if (backBtn) {
            backBtn.style.opacity = this._currentPath.length > 0 ? '1' : '0.3';
            backBtn.style.pointerEvents = this._currentPath.length > 0 ? 'auto' : 'none';
        }

        let items = [];
        const currentFolderName = this._currentPath.length > 0 ? this._currentPath[this._currentPath.length - 1] : 'root';
        const allFolderNames = Object.keys(this.folderState).filter(n => n !== 'Unassigned').sort();

        if (this._currentPath.length === 0 && !searchTerm) {
            allFolderNames.forEach(fn => items.push({ type: 'folder', name: fn }));
            items.push({ type: 'folder', name: 'Unassigned' });
        }

        const allWiNames = world_names || [];
        const targetFolder = this._currentPath.length === 0 ? null : currentFolderName;

        const lorebookFolderMap = new Map();
        for (const fn in this.folderState) {
            for (const item of this.folderState[fn].items) {
                lorebookFolderMap.set(item, fn);
            }
        }

        allWiNames.forEach(wiName => {
            const assignedFolder = lorebookFolderMap.get(wiName) || 'Unassigned';
            let shouldAdd = false;
            if (searchTerm) {
                if (wiName.toLowerCase().includes(searchTerm.toLowerCase())) shouldAdd = true;
            } else {
                if (targetFolder === 'Unassigned' && assignedFolder === 'Unassigned') shouldAdd = true;
                else if (targetFolder && targetFolder === assignedFolder) shouldAdd = true;
            }
            if (shouldAdd) items.push({ type: 'file', name: wiName });
        });

        const fragment = document.createDocumentFragment();
        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'wifm-explorer-item';
            el.dataset.type = item.type;
            el.dataset.name = item.name;

            if (this.isMoveMode && item.type === 'file') {
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.className = 'wifm-item-checkbox';
                cb.style.cssText = 'position:absolute; top:5px; left:5px; z-index:10;';
                cb.checked = this._selectedItems.has(item.name);
                cb.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (cb.checked) this._selectedItems.add(item.name);
                    else this._selectedItems.delete(item.name);
                    this.updateMoveActionsVisibility();
                });
                el.appendChild(cb);
            }

            const icon = document.createElement('div');
            icon.className = 'wifm-item-icon fa-solid';
            if (item.type === 'folder') {
                icon.classList.add('fa-folder');
            } else {
                icon.classList.add('fa-book');
                if (this._currentWorldName === item.name) el.classList.add('active-wi');
            }
            el.appendChild(icon);

            const nameSpan = document.createElement('div');
            nameSpan.className = 'wifm-item-name';
            nameSpan.textContent = item.name;
            el.appendChild(nameSpan);

            el.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.target.type === 'checkbox') return;

                if (this.isMoveMode) {
                    if (item.type === 'file') {
                        const cb = el.querySelector('input[type="checkbox"]');
                        if (cb) {
                            cb.checked = !cb.checked;
                            cb.dispatchEvent(new Event('click'));
                        }
                    }
                    return;
                }

                if (item.type === 'folder') {
                    this._currentPath.push(item.name);
                    this.renderExplorerView();
                } else {
                    await this.loadLorebook(item.name);
                    const searchInput = document.getElementById('wifm-explorer-search');
                    if (searchInput && searchInput.value.trim() !== '') {
                        const ownerFolder = this.findFolderForLorebook(item.name);
                        if (ownerFolder) {
                            this._currentPath = [ownerFolder];
                            searchInput.value = '';
                            this.renderExplorerView();
                        }
                    }
                }
            });

            fragment.appendChild(el);
        });
        container.appendChild(fragment);

        if (items.length === 0) {
            container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; opacity:0.6;">Empty</div>';
        }
    },

    toggleCurrentGlobalStatus: function() {
        if (!this._currentWorldName) return;
        const worldInfoSelect = document.getElementById('world_info');
        if (!worldInfoSelect) return;
        const option = Array.from(worldInfoSelect.options).find(opt => opt.text === this._currentWorldName);
        if (option) {
            option.selected = !option.selected;
            $(worldInfoSelect).trigger('change');
            this.updateGlobalButtonState();
            this.refreshLorebookUI();
        }
    },

    updateGlobalButtonState: function() {
        const btn = document.getElementById('wifm-global-toggle-btn');
        const txt = document.getElementById('wifm-global-toggle-text');
        const worldInfoSelect = document.getElementById('world_info');
        if (!btn || !this._currentWorldName || !worldInfoSelect) {
            if (btn) btn.style.display = 'none';
            return;
        }
        btn.style.display = 'inline-flex';
        const isActive = Array.from(worldInfoSelect.selectedOptions).some(opt => opt.text === this._currentWorldName);
        btn.classList.toggle('greenBG', isActive);
        if (txt) txt.textContent = isActive ? 'Activated' : 'Activate';
    },

    toggleMoveMode: function(forceState) {
        this.isMoveMode = forceState === undefined ? !this.isMoveMode : forceState;
        const moveBtn = document.getElementById('wifm-move-toggle-button');
        const actions = document.getElementById('wifm-move-actions');
        if (this.isMoveMode) {
            moveBtn.style.display = 'none';
            actions.style.display = 'flex';
        } else {
            moveBtn.style.display = 'flex';
            actions.style.display = 'none';
            this._selectedItems.clear();
        }
        this.renderExplorerView();
        this.updateMoveActionsVisibility();
    },

    updateMoveActionsVisibility: function() {
        const btn = document.getElementById('wifm-move-confirm-button');
        if (btn) btn.textContent = `이동 (${this._selectedItems.size})`;
    },

    updateSelectedLorebookName: function(name) {
        const el = document.getElementById('wifm-selected-lorebook-name');
        if (el) el.textContent = name || 'None';
    },

    updateActiveWorldInfoList: function() {
        const sel = document.getElementById('world_info');
        const el = document.getElementById('wifm-active-list-content');
        if (sel && el) {
            const names = Array.from(sel.selectedOptions).map(o => o.text);
            el.textContent = names.length ? names.join(', ') : 'None';
        }
    },

    loadFolderState: function() {
        try {
            const state = accountStorage.getItem(this.storageKey);
            this.folderState = state ? JSON.parse(state) : {};
            if (!this.folderState['Unassigned']) this.folderState['Unassigned'] = { isOpen: true, items: [] };
            const settings = accountStorage.getItem(this.settingsKey);
            if (settings) this.explorerSettings = { ...this.explorerSettings, ...JSON.parse(settings) };
        } catch (e) {
            this.folderState = {};
            logger.error('폴더 상태 로드 오류', e);
        }
    },

    saveFolderState: function() {
        accountStorage.setItem(this.storageKey, JSON.stringify(this.folderState));
    },

    saveExplorerSettings: function() {
        accountStorage.setItem(this.settingsKey, JSON.stringify(this.explorerSettings));
    },

    applyExplorerSettings: function() {
        const win = document.getElementById('wifm-folder-explorer-window');
        if (!win) return;
        win.style.setProperty('--wifm-scale', this.explorerSettings.scale);
        win.classList.toggle('wifm-light-theme', this.explorerSettings.lightTheme);
        const scaleInput = document.getElementById('wifm-setting-scale-input');
        const scaleVal   = document.getElementById('wifm-setting-scale-val');
        const themeInput = document.getElementById('wifm-setting-theme-input');
        if (scaleInput) scaleInput.value = this.explorerSettings.scale;
        if (scaleVal)   scaleVal.textContent = this.explorerSettings.scale + 'x';
        if (themeInput) themeInput.checked = this.explorerSettings.lightTheme;
    },

    toggleSettingsView: function(forceState) {
        const view = document.getElementById('wifm-explorer-settings-view');
        if (!view) return;
        const newState = forceState !== undefined ? forceState : !view.classList.contains('visible');
        if (newState) {
            this.applyExplorerSettings();
            view.classList.add('visible');
        } else {
            view.classList.remove('visible');
        }
    },

    findFolderForLorebook: function(lorebookName) {
        for (const fn in this.folderState) {
            if (this.folderState[fn].items.includes(lorebookName)) return fn;
        }
        return null;
    },

    createNewFolder: function() {
        const folderName = prompt('새 폴더 이름:');
        if (folderName && folderName.trim()) {
            const trimmed = folderName.trim();
            if (this.folderState[trimmed]) return alert('이미 존재함');
            this.folderState[trimmed] = { isOpen: true, items: [] };
            this.saveFolderState();
            this.refreshLorebookUI();
        }
    },

    deleteCurrentFolder: function() {
        if (this._currentPath.length === 0) return;
        const folderName = this._currentPath[this._currentPath.length - 1];
        if (folderName === 'Unassigned') return alert("'Unassigned' 폴더는 삭제할 수 없습니다.");
        if (confirm(`현재 폴더 '${folderName}'를 삭제하시겠습니까?\n\n포함된 월드 인포는 'Unassigned' 폴더로 이동됩니다.`)) {
            const itemsToMove = this.folderState[folderName]?.items || [];
            if (!this.folderState['Unassigned']) this.folderState['Unassigned'] = { isOpen: true, items: [] };
            itemsToMove.forEach(item => {
                if (!this.folderState['Unassigned'].items.includes(item))
                    this.folderState['Unassigned'].items.push(item);
            });
            delete this.folderState[folderName];
            this._currentPath.pop();
            this.saveFolderState();
            this.refreshLorebookUI();
        }
    },

    showFolderMovePopup: function() {
        if (this._selectedItems.size === 0) return alert('선택된 항목 없음');
        const view   = document.getElementById('wifm-move-target-view');
        const header = document.getElementById('wifm-move-target-header');
        const list   = document.getElementById('wifm-move-target-list');
        if (!view || !list) return;
        if (header) header.textContent = `이동할 폴더 선택 (${this._selectedItems.size}개)`;
        list.innerHTML = '';

        const searchInput = document.createElement('input');
        searchInput.type = 'search';
        searchInput.placeholder = '폴더 검색...';
        searchInput.className = 'text_pole';
        searchInput.style.cssText = 'width:100%; height:28px; margin-bottom:6px; box-sizing:border-box;';
        list.appendChild(searchInput);

        const folderListInner = document.createElement('div');
        folderListInner.style.cssText = 'display:flex; flex-direction:column; gap:4px;';
        list.appendChild(folderListInner);

        const allFolders = Object.keys(this.folderState).filter(n => n !== 'Unassigned').sort();
        allFolders.push('Unassigned');

        const renderFolderList = (filterTerm) => {
            folderListInner.innerHTML = '';
            const filtered = filterTerm ? allFolders.filter(f => f.toLowerCase().includes(filterTerm.toLowerCase())) : allFolders;
            filtered.forEach(f => {
                const btn = document.createElement('div');
                btn.className = 'wifm-popup-folder-btn';
                btn.innerHTML = `<i class="fa-solid ${f === 'Unassigned' ? 'fa-folder-open' : 'fa-folder'}"></i><span>${f === 'Unassigned' ? '폴더 없음' : f}</span>`;
                btn.onclick = () => {
                    const currentSearchTerm = document.getElementById('wifm-explorer-search')?.value || null;
                    this._selectedItems.forEach(wi => this.moveLorebookToFolder(wi, f));
                    this.toggleMoveMode(false);
                    view.classList.remove('visible');
                    if (currentSearchTerm && currentSearchTerm.trim() !== '') this.renderExplorerView(currentSearchTerm);
                    else this.refreshLorebookUI();
                };
                folderListInner.appendChild(btn);
            });
            if (filtered.length === 0) folderListInner.innerHTML = '<div style="text-align:center; padding:10px; opacity:0.6;">검색 결과 없음</div>';
        };

        renderFolderList('');
        searchInput.addEventListener('input', () => renderFolderList(searchInput.value));
        view.classList.add('visible');
        setTimeout(() => searchInput.focus(), 50);
    },

    moveLorebookToFolder: function(lorebookName, targetFolderName) {
        for (const f in this.folderState) {
            const idx = this.folderState[f].items.indexOf(lorebookName);
            if (idx > -1) this.folderState[f].items.splice(idx, 1);
        }
        if (targetFolderName !== 'Unassigned') {
            if (!this.folderState[targetFolderName]) this.folderState[targetFolderName] = { items: [] };
            this.folderState[targetFolderName].items.push(lorebookName);
        }
        this.saveFolderState();
    },

    setupCharacterWorldInfoPopupObserver: function() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const dialog = (node.matches && node.matches('dialog.popup')) ? node : node.querySelector('dialog.popup');
                        if (dialog && (dialog.querySelector('.character_world') || dialog.querySelector('.persona_world'))) {
                            this.enhanceWorldInfoPopup(dialog);
                        }
                    }
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        logger.log('Character World Info 팝업 감지 옵저버 시작.');
    },

    enhanceWorldInfoPopup: function(dialog) {
        const selector = dialog.querySelector('.character_world_info_selector') || dialog.querySelector('.persona_world_info_selector');
        if (!selector) return;
        const headerElement = document.getElementById('wifm-selected-lorebook-name');
        let currentWorld = null;
        if (headerElement && headerElement.textContent !== 'None' && headerElement.textContent.trim() !== '') {
            currentWorld = headerElement.textContent.trim();
        }
        if (currentWorld) {
            const originalOption = Array.from(selector.options).find(opt => opt.text === currentWorld);
            if (originalOption) {
                const recommendedOption = document.createElement('option');
                recommendedOption.value = originalOption.value;
                recommendedOption.textContent = `⭐ ${currentWorld}`;
                recommendedOption.dataset.isRecommended = 'true';
                selector.insertBefore(recommendedOption, selector.firstElementChild);
            }
        }
        const searchInput = document.createElement('input');
        searchInput.type = 'search';
        searchInput.placeholder = 'Lorebook 검색...';
        searchInput.className = 'text_pole';
        searchInput.style.cssText = 'width:100%; margin-bottom:5px; box-sizing:border-box;';
        selector.parentNode.insertBefore(searchInput, selector);
        searchInput.addEventListener('input', () => {
            const term = searchInput.value.toLowerCase();
            Array.from(selector.options).forEach(opt => {
                opt.style.display = (opt.value === '' || opt.dataset.isRecommended === 'true' || opt.textContent.toLowerCase().includes(term)) ? '' : 'none';
            });
        });
    },
};

jQuery(async () => {
    const initExtension = async () => {
        if (document.getElementById('WorldInfo') && document.getElementById('world_info')) {
            await WorldInfoFolderMove.init();
        } else if (typeof SillyTavern === 'undefined') {
            setTimeout(initExtension, 1000);
        } else {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (document.getElementById('WorldInfo') && document.getElementById('world_info')) {
                await WorldInfoFolderMove.init();
            } else {
                logger.error('WorldInfo 패널 또는 #world_info 요소를 찾을 수 없습니다.');
                setTimeout(initExtension, 1000);
            }
        }
    };
    initExtension();
    WorldInfoFolderMove.setupCharacterWorldInfoPopupObserver();
});