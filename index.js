import { debounce } from '../../../../scripts/utils.js';
import { Popup } from '../../../../scripts/popup.js';
import { showWorldEditor, world_names, loadWorldInfo, worldInfoCache } from '../../../../scripts/world-info.js';
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
                            <div id="wifm-tool-export-titles" class="menu_button menu_button_icon fa-solid fa-file-lines interactable" title="Export/Import Entry Titles"></div>
                            <div id="wifm-tool-bulk-settings" class="menu_button menu_button_icon fa-solid fa-sliders interactable" title="Bulk Change Entry Settings"></div>
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
                    <div id="world_popup_entries_list" class="list-group"></div>
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
    _isRenaming: false,
    _listenersRegistered: false,
    _entryObserver: null,
    _csrfToken: null,
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
        const renameBtn = document.getElementById('wifm-world-info-entry-rename');
        const originalRenameBtn = document.getElementById('world_popup_name_button');
        if (renameBtn && originalRenameBtn) {
            renameBtn.addEventListener('click', () => {
                const oldName = WorldInfoFolderMove._currentWorldName;
                originalRenameBtn.click();

                if (!oldName) return;

                WorldInfoFolderMove._isRenaming = true;
                let attempts = 0;
                const poll = setInterval(() => {
                    attempts++;
                    const afterNames = world_names || [];
                    const oldGone = !afterNames.includes(oldName);

                    if (oldGone) {
                        clearInterval(poll);
                        const sel = document.getElementById('world_editor_select');
                        const opt = sel ? sel.options[sel.selectedIndex] : null;
                        const newName = (opt && opt.value !== '' && !opt.text.includes('Pick to Edit')) ? opt.text : null;
                        if (newName && newName !== oldName) {
                            WorldInfoFolderMove._handleLorebookRename(oldName, newName);
                        } else {
                            WorldInfoFolderMove._isRenaming = false;
                            WorldInfoFolderMove.refreshLorebookUI();
                        }
                    } else if (attempts > 30) {
                        clearInterval(poll);
                        WorldInfoFolderMove._isRenaming = false;
                        WorldInfoFolderMove.refreshLorebookUI();
                    }
                }, 100);
            });
        }
        routeClick('wifm-world-info-entry-duplicate',  'world_duplicate');
        routeClick('wifm-world-info-entry-export',     'world_popup_export');
        routeClick('wifm-world-info-entry-delete',     'world_popup_delete');
        routeClick('wifm-world-info-entry-open-all',   'OpenAllWIEntries');
        routeClick('wifm-world-info-entry-close-all',  'CloseAllWIEntries');
        routeClick('wifm-world-info-entry-fill-memos', 'world_backfill_memos');
        routeClick('wifm-world-info-entry-apply-sort', 'world_apply_current_sorting');
        routeClick('wifm-world-info-entry-refresh',    'world_refresh');

        // bulk move 버튼
        const entriesHeader = document.querySelector('.wifm-world-info-entries-header');
        if (entriesHeader) {
            const oldPlaceholder = document.getElementById('wibm_bulk_move_wi_entries');
            if (oldPlaceholder) oldPlaceholder.remove();

            let bulkMoverBtn = document.querySelector('body > .menu_button.fa-boxes-packing[id$="-open-transfer-popup"]');

            if (!bulkMoverBtn) {
                bulkMoverBtn = document.createElement('div');
                bulkMoverBtn.id = 'wibm_bulk_move_wi_entries';
                bulkMoverBtn.className = 'menu_button menu_button_icon fa-solid fa-boxes-packing interactable';
                bulkMoverBtn.title = 'Bulk transfer lorebook entries';
                bulkMoverBtn.addEventListener('click', () => {
                    const realBtn = document.querySelector('[id$="-open-transfer-popup"].fa-boxes-packing');
                    if (!realBtn) {
                        logger.warn('WI-Bulk-Mover 버튼을 찾을 수 없습니다. 해당 확장이 설치되어 있는지 확인하세요.');
                        return;
                    }
                    // loadLorebook에서 이미 world_editor_select 동기화가 완료되어 있으므로
                    // 별도 조작 없이 바로 클릭
                    realBtn.click();
                });
            }

            bulkMoverBtn.style.display = '';
            const sep = entriesHeader.querySelector('.wifm-toolbar-sep');
            if (sep) sep.after(bulkMoverBtn);
            else entriesHeader.appendChild(bulkMoverBtn);
        }

        // 검색 토글
        const searchToggleBtn    = document.getElementById('wifm-world-info-entry-search-toggle');
        const searchBarContainer = document.getElementById('wifm-entry-search-bar-container');
        const wifmEntrySearch    = document.getElementById('wifm-world-info-entry-search');
        const originalEntrySearch = document.getElementById('world_info_search');

        if (searchToggleBtn && searchBarContainer) {
            searchToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = searchBarContainer.style.display === 'none';
                searchBarContainer.style.display = isHidden ? 'block' : 'none';
                if (isHidden && wifmEntrySearch) wifmEntrySearch.focus();
            });
        }
        if (wifmEntrySearch && originalEntrySearch) {
            wifmEntrySearch.addEventListener('input', () => {
                originalEntrySearch.value = wifmEntrySearch.value;
                // jQuery trigger + 네이티브 이벤트 둘 다 발생시켜 호환성 확보
                originalEntrySearch.dispatchEvent(new Event('input', { bubbles: true }));
                originalEntrySearch.dispatchEvent(new Event('change', { bubbles: true }));
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
        // Entry 수정 모드 버튼 ──
        const injectEditButtons = (container) => {
            container.querySelectorAll('.world_entry[uid]').forEach(entry => {
                if (entry.querySelector('.wifm-edit-mode-btn')) return;
                const uid = entry.getAttribute('uid');
                const headerControls = entry.querySelector('.gap5px.world_entry_thin_controls');
                if (!headerControls) return;
                const btn = document.createElement('div');
                btn.className = 'wifm-edit-mode-btn menu_button_icon fa-solid fa-pen-to-square interactable';
                btn.style.cssText = 'cursor:pointer; padding:2px 5px; font-size:0.9em; opacity:0.8;';
                btn.title = '수정 모드로 열기';
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    WorldInfoFolderMove.openEditModal(entry, uid);
                });
                const toggleIcon = headerControls.querySelector('.inline-drawer-icon');
                if (toggleIcon) toggleIcon.after(btn);
                else headerControls.prepend(btn);
            });
        };

        const entriesList = document.getElementById('world_popup_entries_list');
        if (entriesList) {
            injectEditButtons(entriesList);
            if (this._entryObserver) this._entryObserver.disconnect();
            this._entryObserver = new MutationObserver(() => injectEditButtons(entriesList));
            this._entryObserver.observe(entriesList, { childList: true, subtree: true });
        }

        document.getElementById('wifm-tool-export-titles')?.addEventListener('click', () => {
            WorldInfoFolderMove.openTitleExportModal();
        });
        document.getElementById('wifm-tool-bulk-settings')?.addEventListener('click', () => {
            WorldInfoFolderMove.openBulkSettingsModal();
        });
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
            const self = this;
            explorerSearch.addEventListener('input', debounce(function() {
                self.renderExplorerView(explorerSearch.value || null);
            }, 300));
        }

        if (!this._listenersRegistered) {
            this._listenersRegistered = true;
            const debouncedRefresh = debounce(() => this.refreshLorebookUI(), 150);
            eventSource.on(event_types.WORLD_INFO_LOADED, debouncedRefresh);
            eventSource.on(event_types.SETTINGS_UPDATED, debouncedRefresh);
            eventSource.on(event_types.WORLD_INFO_UPDATED, debouncedRefresh);
        }

        const coreEditorSelect = document.getElementById('world_editor_select');
        if (coreEditorSelect) {
            $(coreEditorSelect).on('change', () => {
                if (this._isDeselecting) return;
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
                    const searchInput = document.getElementById('wifm-explorer-search');
                    const currentSearch = (searchInput && searchInput.value.trim() !== '') ? searchInput.value : null;
                    this.renderExplorerView(currentSearch);
                }, 100);
            });
        }

        if (window.displayWorldEntries && !window.displayWorldEntries._wifmWrapped) {
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
                const searchInput = document.getElementById('wifm-explorer-search');
                const currentSearch = (searchInput && searchInput.value.trim() !== '') ? searchInput.value : null;
                WorldInfoFolderMove.renderExplorerView(currentSearch);
                return result;
            };
            window.displayWorldEntries._wifmWrapped = true;
        }
    },

    toggleExplorer: function(forceState) {
        const win = document.getElementById('wifm-folder-explorer-window');
        this.isExplorerOpen = forceState !== undefined ? forceState : !this.isExplorerOpen;
        if (this.isExplorerOpen) {
            if (win.parentElement !== document.body) {
                document.body.appendChild(win);
                // explorer 창 클릭이 패널 외부 클릭으로 잡히는 것을 방지
                win.addEventListener('mousedown', (e) => e.stopPropagation(), true);
                win.addEventListener('pointerdown', (e) => e.stopPropagation(), true);
                win.addEventListener('touchstart', (e) => e.stopPropagation(), true);
            }
            // 버튼 위치 기준으로 explorer 창 위치 계산
            const btn = document.getElementById('wifm-explorer-toggle-btn');
            if (btn) {
                const btnRect = btn.getBoundingClientRect();
                const winW = window.innerWidth;
                const winH = window.innerHeight;
                const explorerW = Math.min(400, winW - 20);
                const explorerH = Math.min(550, winH - btnRect.bottom - 10);
                let left = btnRect.left;
                let top = btnRect.bottom + 6;
                // 오른쪽 화면 밖 넘침 방지
                if (left + explorerW > winW - 10) {
                    left = winW - explorerW - 10;
                }
                if (left < 10) left = 10;
                win.style.left = left + 'px';
                win.style.top = top + 'px';
                win.style.width = explorerW + 'px';
                win.style.height = explorerH + 'px';
            }
            win.classList.add('visible');
            this.applyExplorerSettings();
            this.renderExplorerView();
        } else {
            win.classList.remove('visible');
        }
    },

    refreshLorebookUI: function() {
        if (!this._uiInjected) return;
        if (this._isRenaming) return;
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
            $(coreSelect).val('').trigger('change.select2');
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
            this._currentWorldName = name;
            this.updateSelectedLorebookName(name);
            this.updateGlobalButtonState();
            this.updateActiveWorldInfoList();
            // 다른 확장들이 현재 열린 WI를 인식할 수 있도록 world_editor_select 동기화
            const sel = document.getElementById('world_editor_select');
            if (sel) {
                const matchingOption = Array.from(sel.options).find(opt => opt.text === name);
                if (matchingOption) {
                    $(sel).val(matchingOption.value).trigger('change.select2');
                    logger.debug('world_editor_select 동기화 완료:', matchingOption.value, name);
                } else {
                    logger.warn('world_editor_select에서 일치하는 option 없음:', name);
                }
            }
        } catch (error) {
            logger.error('loadLorebook 오류:', error);
        }
    },

    renderExplorerView: function(searchTerm = null) {
        const container = document.getElementById('wifm-explorer-body');
        const breadcrumb = document.getElementById('wifm-explorer-breadcrumb');
        const backBtn = document.getElementById('wifm-explorer-back-btn');
        if (!container) return;

        const currentFolder = this._currentPath.length > 0 ? this._currentPath[this._currentPath.length - 1] : null;

        const renameBtn = document.getElementById('wifm-world-info-rename-folder');
        if (renameBtn) {
            const isRenameable = currentFolder && currentFolder !== 'Unassigned';
            renameBtn.style.display = isRenameable ? 'inline-flex' : 'none';
        }

        const pinBtn = document.getElementById('wifm-world-info-pin-folder');
        if (pinBtn) {
            const isPinnable = currentFolder && currentFolder !== 'Unassigned';
            pinBtn.style.display = isPinnable ? 'inline-flex' : 'none';
            if (isPinnable && this.folderState[currentFolder]) {
                const isPinned = this.folderState[currentFolder].pinned;
                pinBtn.classList.toggle('wifm-pin-active', isPinned);
                pinBtn.title = isPinned ? 'Unpin Folder' : 'Pin Folder to Top';
            }
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

        const allFolderNames = Object.keys(this.folderState)
            .filter(n => n !== 'Unassigned')
            .sort((a, b) => {
                const ap = this.folderState[a]?.pinned ? 1 : 0;
                const bp = this.folderState[b]?.pinned ? 1 : 0;
                if (bp !== ap) return bp - ap;
                return a.localeCompare(b);
            });

        if (this._currentPath.length === 0 && !searchTerm) {
            allFolderNames.forEach(fn => items.push({ type: 'folder', name: fn, pinned: !!this.folderState[fn]?.pinned }));
            items.push({ type: 'folder', name: 'Unassigned', pinned: false });
        }

        const allWiNames = world_names || [];
        const targetFolder = this._currentPath.length === 0 ? null : currentFolderName;

        const lorebookFolderMap = new Map();
        for (const fn in this.folderState) {
            for (const item of this.folderState[fn].items) {
                lorebookFolderMap.set(item, fn);
            }
        }

        const pinnedFileSet = this.pinnedFiles || new Set();
        const matchedFiles = [];
        allWiNames.forEach(wiName => {
            const assignedFolder = lorebookFolderMap.get(wiName) || 'Unassigned';
            let shouldAdd = false;
            if (searchTerm) {
                if (wiName.toLowerCase().includes(searchTerm.toLowerCase())) shouldAdd = true;
            } else {
                if (targetFolder === 'Unassigned' && assignedFolder === 'Unassigned') shouldAdd = true;
                else if (targetFolder && targetFolder === assignedFolder) shouldAdd = true;
            }
            if (shouldAdd) matchedFiles.push({ type: 'file', name: wiName, pinned: pinnedFileSet.has(wiName) });
        });

        matchedFiles.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
        items.push(...matchedFiles);

        const fragment = document.createDocumentFragment();
        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'wifm-explorer-item';
            el.dataset.type = item.type;
            el.dataset.name = item.name;
            if (item.pinned) el.classList.add('wifm-pinned');

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

            if (item.pinned) {
                const pinBadge = document.createElement('i');
                pinBadge.className = 'fa-solid fa-thumbtack wifm-pin-badge';
                el.appendChild(pinBadge);
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

            const moreBtn = document.createElement('div');
            moreBtn.className = 'wifm-more-btn';
            moreBtn.innerHTML = '<i class="fa-solid fa-ellipsis-vertical"></i>';
            moreBtn.title = '옵션';
            moreBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                WorldInfoFolderMove.showContextMenu(e, item);
            });
            el.appendChild(moreBtn);

            let longPressTimer = null;
            el.addEventListener('pointerdown', (e) => {
                if (e.pointerType === 'touch') {
                    longPressTimer = setTimeout(() => {
                        WorldInfoFolderMove.showContextMenu(e, item);
                    }, 500);
                }
            });
            el.addEventListener('pointerup', () => { clearTimeout(longPressTimer); });
            el.addEventListener('pointermove', () => { clearTimeout(longPressTimer); });
            el.addEventListener('pointercancel', () => { clearTimeout(longPressTimer); });
            el.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.target.type === 'checkbox') return;

                if (this.isMoveMode) {
                    if (item.type === 'folder') {
                        this._currentPath.push(item.name);
                        this.renderExplorerView();
                    } else {
                        const cb = el.querySelector('input[type="checkbox"]');
                        if (cb) {
                            cb.checked = !cb.checked;
                            if (cb.checked) this._selectedItems.add(item.name);
                            else this._selectedItems.delete(item.name);
                            this.updateMoveActionsVisibility();
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
                    const ownerFolder = this.findFolderForLorebook(item.name) || 'Unassigned';
                    if (searchInput) searchInput.value = '';
                    this._currentPath = [ownerFolder];
                    this.renderExplorerView();
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
            if (!this.folderState['Unassigned']) this.folderState['Unassigned'] = { isOpen: true, items: [], pinned: false };
            for (const fn in this.folderState) {
                if (this.folderState[fn].pinned === undefined) this.folderState[fn].pinned = false;
                if (this.folderState[fn].pinnedItems) {
                    delete this.folderState[fn].pinnedItems;
                }
            }
            const pinnedFilesRaw = accountStorage.getItem('wifm-pinned-files');
            this.pinnedFiles = pinnedFilesRaw ? new Set(JSON.parse(pinnedFilesRaw)) : new Set();

            const settings = accountStorage.getItem(this.settingsKey);
            if (settings) this.explorerSettings = { ...this.explorerSettings, ...JSON.parse(settings) };
        } catch (e) {
            this.folderState = {};
            this.pinnedFiles = new Set();
            logger.error('폴더 상태 로드 오류', e);
        }
    },
    saveFolderState: function() {
        accountStorage.setItem(this.storageKey, JSON.stringify(this.folderState));
    },
    savePinnedFiles: function() {
        accountStorage.setItem('wifm-pinned-files', JSON.stringify([...this.pinnedFiles]));
    },

    saveExplorerSettings: function() {
        accountStorage.setItem(this.settingsKey, JSON.stringify(this.explorerSettings));
    },

    applyExplorerSettings: function() {
        const isLight = this.explorerSettings.lightTheme;

        const win = document.getElementById('wifm-folder-explorer-window');
        if (win) {
            win.style.setProperty('--wifm-scale', this.explorerSettings.scale);
            win.classList.toggle('wifm-light-theme', isLight);
        }

        const container = document.getElementById('wifm-world-info-redesign');
        if (container) container.classList.toggle('wifm-light-theme', isLight);

        const scaleInput = document.getElementById('wifm-setting-scale-input');
        const scaleVal   = document.getElementById('wifm-setting-scale-val');
        const themeInput = document.getElementById('wifm-setting-theme-input');
        if (scaleInput) scaleInput.value = this.explorerSettings.scale;
        if (scaleVal)   scaleVal.textContent = this.explorerSettings.scale + 'x';
        if (themeInput) themeInput.checked = isLight;

        ['wifm-edit-modal', 'wifm-title-modal', 'wifm-bulk-modal'].forEach(id => {
            const overlay = document.getElementById(id);
            if (!overlay) return;
            const modal = overlay.querySelector('div');
            if (modal) modal.classList.toggle('wifm-light-theme', isLight);
        });

        document.body.classList.toggle('wifm-theme-light', isLight);
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
            this.folderState[trimmed] = { isOpen: true, items: [], pinned: false };
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
    renameFolder: function(folderName) {
        if (!folderName || folderName === 'Unassigned') return alert("'Unassigned' 폴더는 이름을 변경할 수 없습니다.");
        const newName = prompt('새 폴더 이름:', folderName);
        if (!newName || !newName.trim()) return;
        const trimmed = newName.trim();
        if (trimmed === folderName) return;
        if (this.folderState[trimmed]) return alert('같은 이름의 폴더가 이미 존재합니다.');
        this.folderState[trimmed] = { ...this.folderState[folderName] };
        delete this.folderState[folderName];
        const idx = this._currentPath.indexOf(folderName);
        if (idx > -1) this._currentPath[idx] = trimmed;
        this.saveFolderState();
        this.refreshLorebookUI();
    },

    deleteFolder: function(folderName) {
        if (!folderName || folderName === 'Unassigned') return alert("'Unassigned' 폴더는 삭제할 수 없습니다.");
        if (!confirm(`폴더 '${folderName}'를 삭제하시겠습니까?\n\n포함된 월드 인포는 'Unassigned' 폴더로 이동됩니다.`)) return;
        const itemsToMove = this.folderState[folderName]?.items || [];
        if (!this.folderState['Unassigned']) this.folderState['Unassigned'] = { isOpen: true, items: [], pinned: false, pinnedItems: [] };
        itemsToMove.forEach(item => {
            if (!this.folderState['Unassigned'].items.includes(item))
                this.folderState['Unassigned'].items.push(item);
        });
        delete this.folderState[folderName];
        const idx = this._currentPath.indexOf(folderName);
        if (idx > -1) this._currentPath.splice(idx);
        this.saveFolderState();
        this.refreshLorebookUI();
    },

    togglePinFolder: function(folderName) {
        if (!folderName || folderName === 'Unassigned') return;
        if (!this.folderState[folderName]) return;
        this.folderState[folderName].pinned = !this.folderState[folderName].pinned;
        this.saveFolderState();
        this.renderExplorerView();
    },

    togglePinFile: function(fileName) {
        if (!this.pinnedFiles) this.pinnedFiles = new Set();
        if (this.pinnedFiles.has(fileName)) this.pinnedFiles.delete(fileName);
        else this.pinnedFiles.add(fileName);
        this.savePinnedFiles();
        this.renderExplorerView();
    },
    showContextMenu: function(e, item) {
        document.getElementById('wifm-context-menu')?.remove();

        const menu = document.createElement('div');
        menu.id = 'wifm-context-menu';
        menu.className = 'wifm-context-menu';

        const addItem = (icon, label, onClick, extraClass = '') => {
            const row = document.createElement('div');
            row.className = 'wifm-context-item' + (extraClass ? ' ' + extraClass : '');
            row.innerHTML = `<i class="fa-solid ${icon}"></i><span>${label}</span>`;
            row.addEventListener('click', (ev) => { ev.stopPropagation(); menu.remove(); removeCloseListeners(); onClick(); });
            menu.appendChild(row);
        };

        if (item.type === 'folder') {
            const isPinned = !!this.folderState[item.name]?.pinned;
            addItem('fa-thumbtack', isPinned ? '핀 고정 해제' : '상단 고정', () => this.togglePinFolder(item.name), isPinned ? 'wifm-context-active' : '');
            if (item.name !== 'Unassigned') {
                menu.appendChild(Object.assign(document.createElement('div'), { className: 'wifm-context-sep' }));
                addItem('fa-pen', '이름 변경', () => this.renameFolder(item.name));
                addItem('fa-trash-can', '삭제', () => this.deleteFolder(item.name), 'wifm-context-danger');
            }
        } else {
            const isPinned = !!(this.pinnedFiles?.has(item.name));
            addItem('fa-thumbtack', isPinned ? '핀 고정 해제' : '상단 고정', () => this.togglePinFile(item.name), isPinned ? 'wifm-context-active' : '');
            menu.appendChild(Object.assign(document.createElement('div'), { className: 'wifm-context-sep' }));
            addItem('fa-arrows-up-down-left-right', '폴더 이동', () => {
                this._selectedItems.clear();
                this._selectedItems.add(item.name);
                this.showFolderMovePopup();
            });
        }

        document.body.appendChild(menu);
        const mw = menu.offsetWidth, mh = menu.offsetHeight;
        let x, y;
        const triggerEl = e.currentTarget || e.target;
        if (triggerEl && triggerEl.classList?.contains('wifm-more-btn')) {
            const rect = triggerEl.getBoundingClientRect();
            x = rect.right + 4;
            y = rect.top;
        } else {
            x = (e.clientX ?? e.touches?.[0]?.clientX ?? 0);
            y = (e.clientY ?? e.touches?.[0]?.clientY ?? 0);
        }
        if (x + mw > window.innerWidth) x = x - mw - 4;
        if (y + mh > window.innerHeight) y = window.innerHeight - mh - 6;
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';

        const close = (ev) => {
            if (!menu.contains(ev.target)) {
                menu.remove();
                removeCloseListeners();
            }
        };
        const removeCloseListeners = () => {
            document.removeEventListener('mousedown', close, true);
            document.removeEventListener('touchstart', close, true);
        };

        // menu 자체 클릭은 닫기 차단
        menu.addEventListener('mousedown', (ev) => ev.stopPropagation());
        menu.addEventListener('pointerdown', (ev) => ev.stopPropagation());
        menu.addEventListener('touchstart', (ev) => ev.stopPropagation(), { passive: true });

        setTimeout(() => {
            // capture: true 로 등록하면 explorer window 의 stopPropagation 보다 먼저 실행됨
            document.addEventListener('mousedown', close, true);
            document.addEventListener('touchstart', close, { passive: true, capture: true });
        }, 0);
    },
	
    showFolderMovePopup: function() {
        if (this._selectedItems.size === 0) return alert('선택된 항목 없음');
        const view   = document.getElementById('wifm-move-target-view');
        const header = document.getElementById('wifm-move-target-header');
        const list   = document.getElementById('wifm-move-target-list');
        if (!view || !list) return;
        if (header) {
            header.innerHTML = `<i class="fa-solid fa-arrows-up-down-left-right" style="opacity:0.7; margin-right:6px;"></i>이동할 폴더 선택 <span style="opacity:0.6; font-size:0.85em;">(${this._selectedItems.size}개 선택됨)</span>`;
        }
        list.innerHTML = '';

        let selectedFolder = null;

        const searchInput = document.createElement('input');
        searchInput.type = 'search';
        searchInput.placeholder = '🔍 폴더 검색...';
        searchInput.className = 'text_pole';
        searchInput.style.cssText = 'width:100%; height:30px; margin-bottom:8px; box-sizing:border-box;';
        list.appendChild(searchInput);

        const folderListInner = document.createElement('div');
        folderListInner.style.cssText = 'display:flex; flex-direction:column; gap:4px; flex-grow:1; overflow-y:auto;';
        list.appendChild(folderListInner);

        const confirmRow = document.createElement('div');
        confirmRow.style.cssText = 'display:flex; flex-direction:row; gap:6px; margin-top:10px; padding-top:8px; border-top:1px solid var(--separator-color); flex-shrink:0;';

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'menu_button greenBG';
        confirmBtn.style.cssText = 'flex:1; height:32px; display:inline-flex; align-items:center; justify-content:center; gap:6px; border-radius:5px; font-size:0.88em; cursor:pointer; opacity:0.4; pointer-events:none;';
        confirmBtn.innerHTML = '<i class="fa-solid fa-check"></i> 여기로 이동';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'menu_button redWarningBG';
        cancelBtn.style.cssText = 'flex:1; height:32px; display:inline-flex; align-items:center; justify-content:center; gap:6px; border-radius:5px; font-size:0.88em; cursor:pointer;';
        cancelBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> 취소';

        confirmRow.appendChild(confirmBtn);
        confirmRow.appendChild(cancelBtn);
        list.appendChild(confirmRow);

        const allFolders = Object.keys(this.folderState).filter(n => n !== 'Unassigned').sort();
        allFolders.push('Unassigned');

        const setSelected = (f, btnEl) => {
            selectedFolder = f;
            folderListInner.querySelectorAll('.wifm-popup-folder-btn').forEach(b => {
                b.style.background = '';
                b.style.borderColor = 'transparent';
                b.style.boxShadow = '';
            });
            btnEl.style.background = 'rgba(var(--accent_color_rgb, 124, 92, 191), 0.25)';
            btnEl.style.borderColor = 'var(--accent_color, #7c5cbf)';
            btnEl.style.boxShadow = '0 0 0 1px var(--accent_color, #7c5cbf)';
            confirmBtn.style.opacity = '1';
            confirmBtn.style.pointerEvents = 'auto';
            confirmBtn.innerHTML = `<i class="fa-solid fa-check"></i> "${f === 'Unassigned' ? '폴더 없음' : f}" 으로 이동`;
        };

        const renderFolderList = (filterTerm) => {
            folderListInner.innerHTML = '';
            const filtered = filterTerm ? allFolders.filter(f => f.toLowerCase().includes(filterTerm.toLowerCase())) : allFolders;
            filtered.forEach(f => {
                const btn = document.createElement('div');
                btn.className = 'wifm-popup-folder-btn';
                btn.style.cssText = 'border:1px solid transparent; transition: background-color 0.15s, border-color 0.15s, box-shadow 0.15s;';
                const isUnassigned = f === 'Unassigned';
                btn.innerHTML = `<i class="fa-solid ${isUnassigned ? 'fa-folder-open' : 'fa-folder'}" style="color:${isUnassigned ? '#aaa' : '#e8c040'};"></i><span>${isUnassigned ? '폴더 없음 (Unassigned)' : f}</span>`;
                if (selectedFolder === f) {
                    btn.style.background = 'rgba(var(--accent_color_rgb, 124, 92, 191), 0.25)';
                    btn.style.borderColor = 'var(--accent_color, #7c5cbf)';
                    btn.style.boxShadow = '0 0 0 1px var(--accent_color, #7c5cbf)';
                }
                btn.onclick = () => setSelected(f, btn);
                folderListInner.appendChild(btn);
            });
            if (filtered.length === 0) folderListInner.innerHTML = '<div style="text-align:center; padding:12px; opacity:0.5; font-size:0.88em;">검색 결과 없음</div>';
        };

        confirmBtn.onclick = () => {
            if (!selectedFolder) return;
            const currentSearchTerm = document.getElementById('wifm-explorer-search')?.value || null;
            this._selectedItems.forEach(wi => this.moveLorebookToFolder(wi, selectedFolder));
            this.toggleMoveMode(false);
            view.classList.remove('visible');
            if (currentSearchTerm && currentSearchTerm.trim() !== '') this.renderExplorerView(currentSearchTerm);
            else this.refreshLorebookUI();
        };

        cancelBtn.onclick = () => {
            view.classList.remove('visible');
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
            if (!this.folderState[targetFolderName]) this.folderState[targetFolderName] = { items: [], pinned: false };
            this.folderState[targetFolderName].items.push(lorebookName);
        }
        if (this.pinnedFiles?.has(lorebookName)) {
            this.pinnedFiles.delete(lorebookName);
            this.savePinnedFiles();
        }
        this.saveFolderState();
    },
    _handleLorebookRename: function(oldName, newName) {
        for (const fn in this.folderState) {
            const items = this.folderState[fn].items;
            const idx = items.indexOf(oldName);
            if (idx > -1) {
                items[idx] = newName;
                break;
            }
        }

        if (this.pinnedFiles?.has(oldName)) {
            this.pinnedFiles.delete(oldName);
            this.pinnedFiles.add(newName);
            this.savePinnedFiles();
        }

        if (this._currentWorldName === oldName) {
            this._currentWorldName = newName;
            this.updateSelectedLorebookName(newName);
        }

        this.saveFolderState();
        this._isRenaming = false;
        this.refreshLorebookUI();
        logger.log(`Lorebook renamed: "${oldName}" → "${newName}"`);
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
	
    _getSTHeaders: async function() {
        if (this._csrfToken) return { 'Content-Type': 'application/json', 'X-CSRF-Token': this._csrfToken };
        try {
            const resp = await fetch('/csrf-token');
            const data = await resp.json();
            this._csrfToken = data.token;
            return { 'Content-Type': 'application/json', 'X-CSRF-Token': this._csrfToken };
        } catch(e) {
            logger.error('CSRF 토큰 획득 실패:', e);
            return { 'Content-Type': 'application/json' };
        }
    },

    // ── Entry 수정 모드 팝업 ──
    openEditModal: async function(entryEl, uid) {
        const existing = document.getElementById('wifm-edit-modal');
        if (existing) existing.remove();

        const lorebookName = this._currentWorldName;
        if (!lorebookName) return alert('로어북이 선택되지 않았습니다.');

        let wiData;
        try {
            worldInfoCache.delete(lorebookName);
            wiData = await loadWorldInfo(lorebookName);
        } catch(e) {
            return alert('데이터 로드 실패: ' + e.message);
        }

        const uidStr = String(uid);
        const entryData = wiData?.entries?.[uidStr];
        if (!entryData) return alert(`UID ${uid} 데이터를 찾을 수 없습니다.`);

        // ── UI 구성 ──
        const overlay = document.createElement('div');
        overlay.id = 'wifm-edit-modal';
        overlay.style.cssText = 'position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center;';
		overlay.addEventListener('mousedown',  (e) => { e.stopPropagation(); });
		overlay.addEventListener('click',      (e) => { e.stopPropagation(); });
		overlay.addEventListener('touchstart', (e) => { e.stopPropagation(); }, { passive: false });
		overlay.addEventListener('touchend',   (e) => { e.stopPropagation(); }, { passive: false });
		overlay.addEventListener('touchmove',  (e) => { e.stopPropagation(); }, { passive: false });

        const modal = document.createElement('div');
        modal.style.cssText = `
            background:var(--background-color2, #1e1e2e);
            border:1px solid var(--separator-color);
            border-radius:10px; padding:18px; width:820px; max-width:95vw;
            max-height:90vh; overflow-y:auto; overflow-x:hidden; display:flex; flex-direction:column; gap:10px;
            box-shadow:0 8px 32px rgba(0,0,0,0.5);`;
        if (this.explorerSettings.lightTheme) modal.classList.add('wifm-light-theme');
		
        const row = (labelText, el) => {
            const d = document.createElement('div');
            d.style.cssText = 'display:flex; flex-direction:column; gap:3px;';
            const lbl = document.createElement('small');
            lbl.textContent = labelText;
            lbl.style.opacity = '0.7';
            d.appendChild(lbl);
            d.appendChild(el);
            return d;
        };
        const makeInput = (type, value, style='') => {
            const el = document.createElement('input');
            el.type = type; el.value = value ?? '';
            el.className = 'text_pole margin0';
            el.style.cssText = style;
            return el;
        };
        const makeTextarea = (value, rows=6) => {
            const el = document.createElement('textarea');
            el.value = value ?? ''; el.rows = rows;
            el.className = 'text_pole';
            el.style.width = '100%';
            return el;
        };
        const makeSelect = (options, currentVal) => {
            const el = document.createElement('select');
            el.className = 'text_pole widthNatural margin0';
            options.forEach(([v, t]) => {
                const o = document.createElement('option');
                o.value = v; o.textContent = t;
                if (String(v) === String(currentVal)) o.selected = true;
                el.appendChild(o);
            });
            return el;
        };

        // ── 데이터에서 직접 값 읽기 ──
        let stateVal = 'normal';
        if (entryData.constant)   stateVal = 'constant';
        if (entryData.vectorized) stateVal = 'vectorized';
        if (entryData.disable)    stateVal = 'disabled';

        let posVal = String(entryData.position ?? 0);
        // @D 계열(position=4)은 role로 구분, 일단 숫자만 처리
        const posOptions = [
            ['0','↑Char'],['1','↓Char'],['5','↑EM'],['6','↓EM'],
            ['2','↑AN'],['3','↓AN'],['4','@D ⚙️ (sys)']
        ];

        const fMemo    = makeInput('text', entryData.comment ?? '', 'width:100%');
        const fKeys    = makeTextarea((entryData.key ?? []).join(', '), 2);
        const fKeySec  = makeTextarea((entryData.keysecondary ?? []).join(', '), 2);
        const fContent = makeTextarea(entryData.content ?? '', 8);
        const fState   = makeSelect([
            ['constant','🔵 Constant'],
            ['normal','🟢 Normal'],
            ['vectorized','🔗 Vectorized'],
            ['disabled','⛔ Disabled'],
        ], stateVal);
        const fPos     = makeSelect(posOptions, posVal);
        const fOrder   = makeInput('number', entryData.order ?? 100);
        const fProb    = makeInput('number', entryData.probability ?? 100);

        const fCaseSens = makeSelect([['null','Use global'],['true','Yes'],['false','No']], String(entryData.caseSensitive));
        const fWholeW   = makeSelect([['null','Use global'],['true','Yes'],['false','No']], String(entryData.matchWholeWords));
        const fGroupSc  = makeSelect([['null','Use global'],['true','Yes'],['false','No']], String(entryData.useGroupScoring));

        // title
        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = 'font-weight:bold; font-size:1.05em; margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;';
        titleDiv.innerHTML = `<span><i class="fa-solid fa-pen-to-square" style="margin-right:6px; opacity:0.7;"></i>수정 모드 — UID: ${uid}</span>`;
        const closeX = document.createElement('span');
        closeX.innerHTML = '✕';
        closeX.style.cssText = 'cursor:pointer; opacity:0.6; font-size:1.1em;';
        closeX.onclick = () => overlay.remove();
        titleDiv.appendChild(closeX);

        modal.appendChild(titleDiv);
        modal.appendChild(row('Title / Memo', fMemo));
        modal.appendChild(row('Primary Keywords (comma separated)', fKeys));
        modal.appendChild(row('Optional Filter (comma separated)', fKeySec));
        modal.appendChild(row('Content', fContent));

        const rowGrid = document.createElement('div');
        rowGrid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(120px, 1fr)); gap:8px;';
        rowGrid.appendChild(row('State', fState));
        rowGrid.appendChild(row('Position', fPos));
        rowGrid.appendChild(row('Order', fOrder));
        modal.appendChild(rowGrid);

        const rowGrid2 = document.createElement('div');
        rowGrid2.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(110px, 1fr)); gap:8px;';
        rowGrid2.appendChild(row('Probability %', fProb));
        rowGrid2.appendChild(row('Case Sensitive', fCaseSens));
        rowGrid2.appendChild(row('Whole Words', fWholeW));
        rowGrid2.appendChild(row('Group Scoring', fGroupSc));
        modal.appendChild(rowGrid2);

        // ── Apply 버튼 ──
        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex; gap:8px; margin-top:6px;';

        const applyBtn = document.createElement('button');
        applyBtn.className = 'menu_button greenBG';
        applyBtn.style.cssText = 'flex:1; height:34px;';
        applyBtn.innerHTML = '<i class="fa-solid fa-check"></i> 변경사항 적용';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'menu_button redWarningBG';
        cancelBtn.style.cssText = 'height:34px; padding:0 16px; display:inline-flex; align-items:center; justify-content:center; gap:6px; white-space:nowrap; flex-shrink:0;';
        cancelBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> 취소';

        applyBtn.onclick = async () => {
            applyBtn.disabled = true;
            applyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 저장 중...';

            const parseKeys = (str) => str.split(',').map(s => s.trim()).filter(Boolean);

            const newState = fState.value;
            const newConstant   = newState === 'constant';
            const newVectorized = newState === 'vectorized';
            const newDisable    = newState === 'disabled';

            const parseTriState = (str) => str === 'null' ? null : str === 'true';

            const updatedEntry = {
                ...entryData,
                comment:         fMemo.value,
                key:             parseKeys(fKeys.value),
                keysecondary:    parseKeys(fKeySec.value),
                content:         fContent.value,
                constant:        newConstant,
                vectorized:      newVectorized,
                disable:         newDisable,
                position:        parseInt(fPos.value),
                order:           parseInt(fOrder.value) || 0,
                probability:     parseInt(fProb.value) ?? 100,
                caseSensitive:   parseTriState(fCaseSens.value),
                matchWholeWords: parseTriState(fWholeW.value),
                useGroupScoring: parseTriState(fGroupSc.value),
            };

            const updatedData = {
                ...wiData,
                entries: {
                    ...wiData.entries,
                    [uidStr]: updatedEntry,
                }
            };

            try {
                const resp = await fetch('/api/worldinfo/edit', {
                    method: 'POST',
                    headers: await this._getSTHeaders(),
                    body: JSON.stringify({ name: lorebookName, data: updatedData }),
                });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

                // 저장 전 열려있던 entry uid 목록 기억
                const openUids = new Set();
                document.querySelectorAll('#world_popup_entries_list .world_entry[uid]').forEach(el => {
                    const content = el.querySelector('.inline-drawer-content');
                    if (content && content.style.display !== 'none') {
                        openUids.add(el.getAttribute('uid'));
                    }
                });

                worldInfoCache.delete(lorebookName);
                overlay.remove();

                const ctx = (typeof SillyTavern !== 'undefined') ? SillyTavern.getContext() : null;
                if (ctx && ctx.reloadWorldInfoEditor) {
                    await ctx.reloadWorldInfoEditor(lorebookName, false);
                } else {
                    await showWorldEditor(lorebookName);
                }

                // 재렌더 후 원래 열려있던 entry 다시 열기
                if (openUids.size > 0) {
                    await new Promise(resolve => {
                        const list = document.getElementById('world_popup_entries_list');
                        if (!list) return resolve();

                        const tryRestore = () => {
                            const allEntries = list.querySelectorAll('.world_entry[uid]');
                            if (allEntries.length === 0) return false;
                            allEntries.forEach(el => {
                                if (openUids.has(el.getAttribute('uid'))) {
                                    const content = el.querySelector('.inline-drawer-content');
                                    const icon    = el.querySelector('.inline-drawer-icon');
                                    if (content && content.style.display === 'none' && icon) {
                                        icon.click();
                                    }
                                }
                            });
                            return true;
                        };

                        if (tryRestore()) return resolve();

                        const observer = new MutationObserver(() => {
                            if (tryRestore()) {
                                observer.disconnect();
                                resolve();
                            }
                        });
                        observer.observe(list, { childList: true, subtree: true });

                        setTimeout(() => { observer.disconnect(); resolve(); }, 3000);
                    });
                }

            } catch(e) {
                logger.error('저장 실패:', e);
                alert('저장 실패: ' + e.message);
                applyBtn.disabled = false;
                applyBtn.innerHTML = '<i class="fa-solid fa-check"></i> 변경사항 적용';
            }
        };
        cancelBtn.onclick = () => overlay.remove();

        btnRow.appendChild(applyBtn);
        btnRow.appendChild(cancelBtn);
        modal.appendChild(btnRow);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        if (document.body.classList.contains('wifm-theme-light')) {
            const modal = overlay.querySelector('div');
            if (modal) modal.classList.add('wifm-light-theme');
        }
    },

    // Title/Memo 추출 및 재삽입
    openTitleExportModal: function() {
        const entries = Array.from(
            document.querySelectorAll('#world_popup_entries_list .world_entry[uid]')
        );
        if (!entries.length) return alert('로드된 entry가 없습니다.');

        const titles = entries.map(e => {
            const ta = e.querySelector('textarea[name="comment"]');
            return ta ? ta.value : '';
        });

        const existing = document.getElementById('wifm-title-modal');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'wifm-title-modal';
        overlay.style.cssText = 'position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center;';
		overlay.addEventListener('mousedown',  (e) => { e.stopPropagation(); });
		overlay.addEventListener('click',      (e) => { e.stopPropagation(); });
		overlay.addEventListener('touchstart', (e) => { e.stopPropagation(); }, { passive: false });
		overlay.addEventListener('touchend',   (e) => { e.stopPropagation(); }, { passive: false });
		overlay.addEventListener('touchmove',  (e) => { e.stopPropagation(); }, { passive: false });

        const modal = document.createElement('div');
        modal.style.cssText = `
            background:var(--background-color2, #1e1e2e);
            border:1px solid var(--separator-color);
            border-radius:10px; padding:18px; width:780px; max-width:95vw;
            max-height:85vh; display:flex; flex-direction:column; gap:10px;
            box-shadow:0 8px 32px rgba(0,0,0,0.5);`;
        if (this.explorerSettings.lightTheme) modal.classList.add('wifm-light-theme');

        modal.innerHTML = `
            <div style="font-weight:bold; font-size:1.05em; display:flex; justify-content:space-between; align-items:center;">
                <span><i class="fa-solid fa-file-lines" style="margin-right:6px; opacity:0.7;"></i>Entry Title 추출 / 재삽입</span>
                <span id="wifm-title-modal-close" style="cursor:pointer; opacity:0.6;">✕</span>
            </div>
            <small style="opacity:0.65;">한 줄 = entry 하나입니다. 줄 수를 바꾸지 마세요. 번역 후 붙여넣고 적용하면 됩니다.</small>
            <div style="display:flex; gap:6px;">
                <button id="wifm-title-download-btn" class="menu_button" style="flex:1; height:30px;">
                    <i class="fa-solid fa-download"></i> TXT 다운로드
                </button>
                <button id="wifm-title-apply-btn" class="menu_button greenBG" style="flex:1; height:30px;">
                    <i class="fa-solid fa-check"></i> 적용 (${titles.length}개)
                </button>
            </div>
            <textarea id="wifm-title-textarea" class="text_pole" style="flex:1; min-height:350px; font-family:monospace; font-size:0.88em; white-space:pre;"></textarea>
        `;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        if (document.body.classList.contains('wifm-theme-light')) {
            const modal = overlay.querySelector('div');
            if (modal) modal.classList.add('wifm-light-theme');
        }

        const ta = modal.querySelector('#wifm-title-textarea');
        ta.value = titles.join('\n');

        modal.querySelector('#wifm-title-modal-close').onclick = () => overlay.remove();

        modal.querySelector('#wifm-title-download-btn').onclick = () => {
            const lorebookName = this._currentWorldName || 'titles';
            const blob = new Blob([ta.value], { type: 'text/plain;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${lorebookName}_titles.txt`;
            a.click();
            URL.revokeObjectURL(a.href);
        };

        modal.querySelector('#wifm-title-apply-btn').onclick = () => {
            const lines = ta.value.split('\n');
            if (lines.length !== entries.length) {
                return alert(`줄 수 불일치!\n원본: ${entries.length}줄 / 현재: ${lines.length}줄\n줄 수를 맞춰주세요.`);
            }
            entries.forEach((entryEl, i) => {
                const field = entryEl.querySelector('textarea[name="comment"]');
                if (!field) return;
                field.value = lines[i];
                field.dispatchEvent(new Event('input', { bubbles: true }));
                field.dispatchEvent(new Event('change', { bubbles: true }));
            });
            overlay.remove();
            alert(`${entries.length}개 title 적용 완료.`);
        };
    },

    // 일괄 설정 변경
    openBulkSettingsModal: function() {
        const entries = Array.from(
            document.querySelectorAll('#world_popup_entries_list .world_entry[uid]')
        );
        if (!entries.length) return alert('로드된 entry가 없습니다.');

        const existing = document.getElementById('wifm-bulk-modal');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'wifm-bulk-modal';
        overlay.style.cssText = 'position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center;';
		overlay.addEventListener('mousedown',  (e) => { e.stopPropagation(); });
		overlay.addEventListener('click',      (e) => { e.stopPropagation(); });
		overlay.addEventListener('touchstart', (e) => { e.stopPropagation(); }, { passive: false });
		overlay.addEventListener('touchend',   (e) => { e.stopPropagation(); }, { passive: false });
		overlay.addEventListener('touchmove',  (e) => { e.stopPropagation(); }, { passive: false });


        const modal = document.createElement('div');
        modal.style.cssText = `
            background:var(--background-color2, #1e1e2e);
            border:1px solid var(--separator-color);
            border-radius:10px; padding:18px; width:460px; max-width:95vw;
            display:flex; flex-direction:column; gap:12px;
            box-shadow:0 8px 32px rgba(0,0,0,0.5);`;
        if (this.explorerSettings.lightTheme) modal.classList.add('wifm-light-theme');

        const opts3 = `<option value="__skip__">-- 변경 안 함 --</option><option value="null">Use global</option><option value="true">Yes</option><option value="false">No</option>`;
        const stateOpts = `<option value="__skip__">-- 변경 안 함 --</option><option value="constant">🔵 Constant</option><option value="normal">🟢 Normal</option><option value="vectorized">🔗 Vectorized</option>`;

        modal.innerHTML = `
            <div style="font-weight:bold; font-size:1.05em; display:flex; justify-content:space-between; align-items:center;">
                <span><i class="fa-solid fa-sliders" style="margin-right:6px; opacity:0.7;"></i>일괄 설정 변경</span>
                <span id="wifm-bulk-close" style="cursor:pointer; opacity:0.6;">✕</span>
            </div>
            <small style="opacity:0.65;">"변경 안 함"으로 두면 해당 항목은 그대로 유지됩니다.<br> 토글이 열려있는 엔트리에만 설정이 반영됩니다.</small>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div style="display:flex; flex-direction:column; gap:3px;">
                    <small style="opacity:0.7;">State</small>
                    <select id="wifm-bulk-state" class="text_pole margin0">${stateOpts}</select>
                </div>
                <div style="display:flex; flex-direction:column; gap:3px;">
                    <small style="opacity:0.7;">Case Sensitive</small>
                    <select id="wifm-bulk-case" class="text_pole margin0">${opts3}</select>
                </div>
                <div style="display:flex; flex-direction:column; gap:3px;">
                    <small style="opacity:0.7;">Whole Words</small>
                    <select id="wifm-bulk-whole" class="text_pole margin0">${opts3}</select>
                </div>
                <div style="display:flex; flex-direction:column; gap:3px;">
                    <small style="opacity:0.7;">Group Scoring</small>
                    <select id="wifm-bulk-group" class="text_pole margin0">${opts3}</select>
                </div>
                <div style="display:flex; flex-direction:column; gap:3px;">
                    <small style="opacity:0.7;">Position</small>
                    <select id="wifm-bulk-position" class="text_pole margin0">
                        <option value="__skip__">-- 변경 안 함 --</option>
                        <option value="0">↑Char</option><option value="1">↓Char</option>
                        <option value="5">↑EM</option><option value="6">↓EM</option>
                        <option value="2">↑AN</option><option value="3">↓AN</option>
                    </select>
                </div>
                <div style="display:flex; flex-direction:column; gap:3px;">
                    <small style="opacity:0.7;">Order (빈칸=변경안함)</small>
                    <input id="wifm-bulk-order" type="number" class="text_pole margin0" placeholder="변경 안 함" min="0" max="9999">
                </div>
            </div>
            <div id="wifm-bulk-preview" style="font-size:0.8em; opacity:0.6; min-height:16px;"></div>
            <div style="display:flex; gap:8px;">
                <button id="wifm-bulk-apply" class="menu_button greenBG" style="flex:1; height:34px;">
                    <i class="fa-solid fa-check"></i> 적용
                </button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        if (document.body.classList.contains('wifm-theme-light')) {
            const modal = overlay.querySelector('div');
            if (modal) modal.classList.add('wifm-light-theme');
        }

        modal.querySelector('#wifm-bulk-close').onclick = () => overlay.remove();

        const applyField = (entryEl, sel, newVal) => {
            const el = entryEl.querySelector(sel);
            if (!el || newVal === '__skip__' || newVal === '') return;
            el.value = newVal;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        };

        modal.querySelector('#wifm-bulk-apply').onclick = () => {
            const bState    = modal.querySelector('#wifm-bulk-state').value;
            const bCase     = modal.querySelector('#wifm-bulk-case').value;
            const bWhole    = modal.querySelector('#wifm-bulk-whole').value;
            const bGroup    = modal.querySelector('#wifm-bulk-group').value;
            const bPos      = modal.querySelector('#wifm-bulk-position').value;
            const bOrder    = modal.querySelector('#wifm-bulk-order').value;

            const changes = [bState, bCase, bWhole, bGroup, bPos, bOrder].filter(v => v && v !== '__skip__');
            if (!changes.length) return alert('변경할 항목을 선택해주세요.');
            if (!confirm(`${entries.length}개 entry 중 현재 열려있는 entry에만 적용됩니다. 계속하시겠습니까?`)) return;

            entries.forEach(entryEl => {
                applyField(entryEl, 'select[name="entryStateSelector"]', bState);
                applyField(entryEl, 'select[name="caseSensitive"]',      bCase);
                applyField(entryEl, 'select[name="matchWholeWords"]',    bWhole);
                applyField(entryEl, 'select[name="useGroupScoring"]',    bGroup);
                applyField(entryEl, 'select[name="position"]',           bPos);
                applyField(entryEl, 'input[name="order"]',               bOrder);
            });
            overlay.remove();
            alert(`열려있는 entry에 적용 완료.`);
        };
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
    const doInit = async () => {
        await WorldInfoFolderMove.init();
        WorldInfoFolderMove.setupCharacterWorldInfoPopupObserver();
    };

    if (event_types.APP_READY) {
        eventSource.once(event_types.APP_READY, doInit);
    } else {
        const waitForDom = async () => {
            if (document.getElementById('WorldInfo') && document.getElementById('world_info')) {
                await doInit();
            } else {
                setTimeout(waitForDom, 500);
            }
        };
        waitForDom();
    }
});