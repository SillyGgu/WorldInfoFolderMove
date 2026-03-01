

import { debounce, navigation_option } from '../../../../scripts/utils.js';
import { Popup } from '../../../../scripts/popup.js';

import { getFreeWorldName, createNewWorldInfo, loadWorldInfo, world_names, saveWorldInfo, createWorldInfoEntry, deleteWorldInfoEntry, deleteWIOriginalDataValue } from '../../../../scripts/world-info.js';
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
    
    <!-- 1. 메인 툴바 (Main Toolbar) -->
    <div id="wifm-main-toolbar">
        <!-- 폴더 열기 버튼 -->
        <div id="wifm-explorer-toggle-btn" class="menu_button interactable" title="Open Folder Explorer">
            <i class="fa-solid fa-folder-open"></i>&nbsp; Folders
        </div>
        
        <!-- [수정 2] 새 World Info 및 가져오기 버튼을 여기로 이동 -->
        <div id="wifm-world-info-new-button" class="menu_button menu_button_icon fa-solid fa-file-circle-plus interactable" title="Create New World Info"></div>
        <div id="wifm-world-info-import-button" class="menu_button menu_button_icon fa-solid fa-file-import interactable" title="Import World Info"></div>
        
        <!-- 현재 편집 중인 이름 -->
        <div id="wifm-current-wi-display">
            <span style="opacity: 0.6;">Editing:</span> <span id="wifm-selected-lorebook-name" style="font-weight: bold;">None</span>
        </div>
    </div>

    <!-- 2. Floating Explorer Window -->
    <div id="wifm-folder-explorer-window">
        <!-- 윈도우 헤더 -->
        <div class="wifm-explorer-header">
            <div id="wifm-explorer-back-btn" class="menu_button menu_button_icon fa-solid fa-arrow-up interactable" title="Go Up"></div>
            <div id="wifm-explorer-breadcrumb" class="wifm-breadcrumb-path">root</div>
            <div id="wifm-explorer-close-btn" class="menu_button menu_button_icon fa-solid fa-xmark interactable" title="Close"></div>
        </div>

        <!-- 폴더 관리 툴바 (폴더 생성/이동만 남김) -->
        <div class="wifm-explorer-toolbar" style="padding: 5px; background: var(--color-bg-tertiary); display: flex; align-items: center; gap: 5px; border-bottom: 1px solid var(--separator-color);">
            <div id="wifm-world-info-new-folder" class="menu_button menu_button_icon fa-solid fa-folder-plus interactable" title="New Folder"></div>
            
            <div style="width: 1px; height: 20px; background: var(--separator-color); margin: 0 5px;"></div>
            
            <div id="wifm-move-toggle-button" class="menu_button menu_button_icon fa-solid fa-arrows-up-down-left-right interactable" title="Move Mode"></div>
            <div id="wifm-move-actions" style="display: none; gap: 5px;">
                <button id="wifm-move-confirm-button" class="menu_button greenBG" style="font-size: 0.8em;">Move</button>
                <button id="wifm-move-cancel-button" class="menu_button redWarningBG" style="font-size: 0.8em;">Cancel</button>
            </div>

            <div style="flex-grow: 1;"></div>
            <input type="search" id="wifm-explorer-search" class="text_pole" style="height: 28px; width: 120px;" placeholder="Filter...">
        </div>

        <!-- 아이콘 그리드 -->
        <div id="wifm-explorer-body" class="wifm-explorer-body"></div>
    </div>

    <!-- 3. 메인 에디터 영역 -->
    <div class="navigator-body">
        <div id="wifm-world-info-panels-wrapper">
            
            <div id="wifm-world-info-entries-panel" class="wifm-world-info-panel active">
                <div class="wifm-panel-content-wrapper" style="height: 100%;">
                    <!-- Entry Toolbar -->
                    <div class="wifm-world-info-entries-header">
                        <div id="wifm-world-info-entry-new" class="menu_button menu_button_icon fa-solid fa-plus interactable" title="New Entry"></div>
                        <div id="wifm-world-info-entry-rename" class="menu_button menu_button_icon fa-solid fa-pencil interactable" title="Rename"></div>
                        <div id="wifm-world-info-entry-duplicate" class="menu_button menu_button_icon fa-solid fa-paste interactable" title="Duplicate"></div>
                        <div id="wifm-world-info-entry-delete" class="menu_button menu_button_icon fa-solid fa-trash-can redWarningBG interactable" title="Delete"></div>
                        
                        <div style="margin-left: auto; display: flex; gap: 5px;">
                            <div id="wifm-world-info-entry-search-toggle" class="menu_button menu_button_icon fa-solid fa-magnifying-glass interactable"></div>
                            <select id="wifm-world-info-entry-sort" class="text_pole margin0"></select>
                            <div id="wifm-world-info-entry-refresh" class="menu_button menu_button_icon fa-solid fa-arrows-rotate interactable"></div>
                        </div>
                    </div>

                    <div id="wifm-entry-search-bar-container" style="display: none; padding-bottom: 5px;">
                        <input type="search" class="text_pole textarea_compact" id="wifm-world-info-entry-search" placeholder="Search entries...">
                    </div>

                    <div id="wifm-active-world-info-list" class="block_panel" style="margin-bottom: 10px; font-size: 0.8em; padding: 5px;">
                        <strong>Activated:</strong> <span id="wifm-active-list-content">None</span>
                    </div>

                    <div id="world_info_pagination" class="pagination-container"></div>
                    <div id="world_popup_entries_list" class="list-group" style="flex-grow: 1; overflow-y: auto;"></div>
                    <div id="wifm-editor-placeholder"></div>
                </div>
            </div>

            <!-- Settings Panel -->
            <div id="wifm-world-info-settings-panel" class="wifm-world-info-panel">
                 <div class="wifm-panel-content-wrapper">
                    <div id="wifm-activation-settings-fold" class="wifm-foldable-container">
                        <div class="wifm-foldable-header menu_button" style="width: 100%; box-sizing: border-box;">
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
    isMoveMode: false,
    folderState: {},
    storageKey: 'wifm-wi-folder-state',
    
    
    _currentPath: [],
    isExplorerOpen: false,

    init: async function() {
        this.loadFolderState();
        await this.injectUI();
        this.setupEventListeners();
        this._uiInjected = true;
        this.refreshLorebookUI();
        this.updateSelectedLorebookName(null);
    },

    injectUI: async function() {
        logger.log('UI 주입 (Redesign with Toolbar inside Explorer)');
        try {
            const originalPanel = document.getElementById('WorldInfo');
            if (originalPanel) {
                
                // 1. 숨겨진 저장소 생성 (ST 원본 요소 보존용)
                let hiddenStorage = document.getElementById('wifm-hidden-storage');
                if (!hiddenStorage) {
                    hiddenStorage = document.createElement('div');
                    hiddenStorage.id = 'wifm-hidden-storage';
                    hiddenStorage.style.display = 'none';
                    document.body.appendChild(hiddenStorage);
                }
                
                const preserveAndMove = (id) => { 
                    const el = document.getElementById(id);
                    if (el) hiddenStorage.appendChild(el); 
                };

				const idsToPreserve = [
					'wiActivationSettings',
					'world_editor_select_container',
					'world_info_entry_editor_container',
					'world_info',
					'world_info_search',
					'world_info_sort_order',
					'world_popup_new',
					'world_popup_name_button',
					'world_duplicate',
					'world_popup_export',
					'world_popup_delete',
					'OpenAllWIEntries',
					'CloseAllWIEntries',
					'world_backfill_memos',
					'world_apply_current_sorting',
					'world_refresh',
					'world_create_button',
					'world_import_button',
					'world_import_file',
					'wibm_bulk_move_wi_entries',
				];
                idsToPreserve.forEach(id => preserveAndMove(id));

                
                // 2. UI 교체
                originalPanel.innerHTML = WIFM_UI_HTML;


                // 3. 보존된 요소들을 적절한 기능적 위치로 복구 (또는 숨겨진 상태 유지)
                
                // 설정 패널 내용 복구
                const targetSettingsContent = document.querySelector('#wifm-activation-settings-fold .wifm-foldable-content');
                const savedSettings = hiddenStorage.querySelector('#wiActivationSettings');
                if (targetSettingsContent && savedSettings) {
                    targetSettingsContent.appendChild(savedSettings);
                    savedSettings.style.display = 'block'; 
                }

                // 엔트리 에디터 복구 (리스트 바로 다음으로 이동)
                const entriesListContainer = document.getElementById('world_popup_entries_list');
                const savedEditor = hiddenStorage.querySelector('#world_info_entry_editor_container');
                if (entriesListContainer && savedEditor) {
                    entriesListContainer.after(savedEditor);
                    savedEditor.style.display = '';
                }
                
                // 정렬 옵션 동기화 (원본은 hiddenStorage에 있고, 옵션값만 복사해옴)
                const wifmSort = document.getElementById('wifm-world-info-entry-sort');
                const originalSort = hiddenStorage.querySelector('#world_info_sort_order');
                if (wifmSort && originalSort) {
                    wifmSort.innerHTML = '';
                    Array.from(originalSort.options).forEach(opt => wifmSort.add(opt.cloneNode(true)));
                    wifmSort.value = originalSort.value;
                }
            }
        } catch (error) {
            logger.error('UI 주입 오류', error);
        }
    },
    setupEntryManagementListeners: function() {
        // 1. 버튼 클릭 라우팅 (확장 UI 버튼 -> ST 원본 버튼)
        const routeClick = (newId, oldId) => {
            const newBtn = document.getElementById(newId);
            const oldBtn = document.getElementById(oldId);
            if (newBtn && oldBtn) {
                newBtn.addEventListener('click', () => oldBtn.click());
            }
        };

        routeClick('wifm-world-info-entry-new', 'world_popup_new');
        routeClick('wifm-world-info-entry-rename', 'world_popup_name_button');
        routeClick('wifm-world-info-entry-duplicate', 'world_duplicate');
        routeClick('wifm-world-info-entry-delete', 'world_popup_delete');
        routeClick('wifm-world-info-entry-refresh', 'world_refresh');
        
        // 2. 검색창 토글 UI
        const searchToggleBtn = document.getElementById('wifm-world-info-entry-search-toggle');
        const searchBarContainer = document.getElementById('wifm-entry-search-bar-container');
        const wifmEntrySearch = document.getElementById('wifm-world-info-entry-search');
        
        // 중요: injectUI에서 world_info_search를 보존했으므로 이제 찾을 수 있음
        const originalEntrySearch = document.getElementById('world_info_search');

        if (searchToggleBtn && searchBarContainer) {
            searchToggleBtn.addEventListener('click', () => {
                const isHidden = searchBarContainer.style.display === 'none';
                searchBarContainer.style.display = isHidden ? 'block' : 'none';
                if (isHidden && wifmEntrySearch) wifmEntrySearch.focus();
            });
        }

        // 3. 검색어 입력 동기화 (확장 검색창 -> ST 원본 검색창)
        if (wifmEntrySearch && originalEntrySearch) {
            wifmEntrySearch.addEventListener('input', () => {
                originalEntrySearch.value = wifmEntrySearch.value;
                // jQuery 이벤트 트리거 필수
                $(originalEntrySearch).trigger('input');
            });
        } else {
            console.warn('[WIFM] 검색창 동기화 실패: 원본 또는 새 검색창을 찾을 수 없음');
        }

        // 4. 정렬 옵션 동기화
        const wifmSort = document.getElementById('wifm-world-info-entry-sort');
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
        document.getElementById('wifm-explorer-close-btn').addEventListener('click', () => this.toggleExplorer(false));
        
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
        document.getElementById('wifm-world-info-new-button').addEventListener('click', async () => {
            const coreCreateBtn = document.getElementById('world_create_button'); 
            if(coreCreateBtn) coreCreateBtn.click(); 
            else { await createNewWorldInfo(); this.refreshLorebookUI(); }
        });
        document.getElementById('wifm-world-info-import-button').addEventListener('click', () => {
            const coreImportBtn = document.getElementById('world_import_button');
            if(coreImportBtn) coreImportBtn.click();
        });

        
        this.setupEntryManagementListeners();

        
        const foldHeader = document.querySelector('#wifm-activation-settings-fold .wifm-foldable-header');
        if (foldHeader) {
            
            const newHeader = foldHeader.cloneNode(true);
            foldHeader.parentNode.replaceChild(newHeader, foldHeader);
            
            newHeader.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const container = document.getElementById('wifm-activation-settings-fold');
                container.classList.toggle('open');
            });
        }
        
        
        const explorerSearch = document.getElementById('wifm-explorer-search');
        if(explorerSearch) {
            explorerSearch.addEventListener('input', debounce(() => this.renderExplorerView(explorerSearch.value), 300));
        }

        
        eventSource.on(event_types.WORLD_INFO_LOADED, () => this.refreshLorebookUI());
        eventSource.on(event_types.SETTINGS_UPDATED, () => this.refreshLorebookUI());
        eventSource.on(event_types.WORLD_INFO_UPDATED, () => this.refreshLorebookUI());
        
        const coreEditorSelect = document.getElementById('world_editor_select');
        if (coreEditorSelect) {
            $(coreEditorSelect).on('change', () => {
                const selectedName = coreEditorSelect.options[coreEditorSelect.selectedIndex].text;
                const finalName = (selectedName && selectedName !== '(선택/생성...)') ? selectedName : null;
                this.updateSelectedLorebookName(finalName);
            });
        }
        if (window.displayWorldEntries) {
            const originalDisplay = window.displayWorldEntries;
            
            window.displayWorldEntries = async function(name, data, ...args) {
                // 원본 함수 실행
                const result = await originalDisplay.apply(this, [name, data, ...args]);
                
                // 확장 기능 상태 동기화
                this._currentWorldName = name;
                WorldInfoFolderMove.updateSelectedLorebookName(name); // 상단 툴바 이름 갱신
                
                // 탐색기(Floating Window)의 아이콘 하이라이트 갱신
                if (WorldInfoFolderMove.isExplorerOpen) {
                    WorldInfoFolderMove.renderExplorerView();
                }

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
        this.renderExplorerView();
        this.updateActiveWorldInfoList();
    },

    
    renderExplorerView: function(searchTerm = null) {
        const container = document.getElementById('wifm-explorer-body');
        const breadcrumb = document.getElementById('wifm-explorer-breadcrumb');
        const backBtn = document.getElementById('wifm-explorer-back-btn');
        if (!container) return;

        container.innerHTML = '';
        
        // 브레드크럼(경로) 업데이트
        const pathStr = this._currentPath.length === 0 ? 'Home' : 'Home > ' + this._currentPath.join(' > ');
        if(breadcrumb) breadcrumb.textContent = pathStr;
        
        // 뒤로가기 버튼 상태
        if(backBtn) {
            backBtn.style.opacity = this._currentPath.length > 0 ? '1' : '0.3';
            backBtn.style.pointerEvents = this._currentPath.length > 0 ? 'auto' : 'none';
        }

        let items = [];
        const currentFolderName = this._currentPath.length > 0 ? this._currentPath[this._currentPath.length - 1] : 'root';
        const allFolderNames = Object.keys(this.folderState).filter(n => n !== 'Unassigned').sort();
        
        // 1. 폴더 목록 추가
        if (this._currentPath.length === 0 && !searchTerm) {
            allFolderNames.forEach(folderName => items.push({ type: 'folder', name: folderName }));
            items.push({ type: 'folder', name: 'Unassigned' });
        }

        // 2. 파일(Lorebook) 목록 추가
        const allWiNames = world_names || []; 
        const targetFolder = (this._currentPath.length === 0) ? null : currentFolderName;

        allWiNames.forEach(wiName => {
            const assignedFolder = this.findFolderForLorebook(wiName) || 'Unassigned';
            
            let shouldAdd = false;
            if (searchTerm) {
                if (wiName.toLowerCase().includes(searchTerm.toLowerCase())) shouldAdd = true;
            } else {
                if (targetFolder === 'Unassigned' && assignedFolder === 'Unassigned') shouldAdd = true;
                else if (targetFolder && targetFolder === assignedFolder) shouldAdd = true;
            }

            if (shouldAdd) {
                items.push({ type: 'file', name: wiName });
            }
        });

        // 3. 아이템 렌더링
        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'wifm-explorer-item';
            el.dataset.type = item.type;
            el.dataset.name = item.name;

            // 이동 모드 체크박스
            if (this.isMoveMode && item.type === 'file') {
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.className = 'wifm-item-checkbox';
                cb.style.cssText = "position: absolute; top: 5px; left: 5px; z-index: 10;";
                cb.checked = this._selectedItems.has(item.name);
                cb.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if(cb.checked) this._selectedItems.add(item.name);
                    else this._selectedItems.delete(item.name);
                    this.updateMoveActionsVisibility();
                });
                el.appendChild(cb);
            }

            // 아이콘
            const icon = document.createElement('div');
            icon.className = 'wifm-item-icon fa-solid';
            if (item.type === 'folder') {
                icon.classList.add('fa-folder');
            } else {
                icon.classList.add('fa-book');
                
                // [추가] 현재 편집 중인 파일 하이라이트 (초록색)
                if (this._currentWorldName === item.name) {
                    el.classList.add('active-wi'); 
                }

                // (옵션) 전역 활성화된 파일 표시 로직 유지
                const worldInfoSelect = document.getElementById('world_info');
                if (worldInfoSelect) {
                    const isActive = Array.from(worldInfoSelect.selectedOptions).some(o => o.text === item.name);
                    // 전역 활성화 상태는 별도 스타일링하거나 아이콘 색상 변경 등 가능
                    // 여기서는 기존 active-wi 클래스가 '편집 중'을 의미하도록 위에서 처리함
                    // 필요시 isActive 체크하여 다른 클래스 추가 가능
                }
            }
            el.appendChild(icon);

            // 이름 텍스트
            const nameSpan = document.createElement('div');
            nameSpan.className = 'wifm-item-name';
            nameSpan.textContent = item.name;
            el.appendChild(nameSpan);

            // 클릭 이벤트
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
                    // Lorebook 로드 호출
                    await this.loadLorebook(item.name);
                }
            });

            container.appendChild(el);
        });

        if (items.length === 0) {
            container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 20px; opacity: 0.6;">Empty</div>';
        }
    },

    loadLorebook: async function(name) {
        const coreEditorSelect = document.getElementById('world_editor_select');
        
        // 1. 패널 전환 (Settings -> Entries)
        const entriesPanel = document.getElementById('wifm-world-info-entries-panel');
        const settingsPanel = document.getElementById('wifm-world-info-settings-panel');
        if (entriesPanel && settingsPanel) {
            settingsPanel.classList.remove('active');
            entriesPanel.classList.add('active');
        }

        // 2. 검색 필터 초기화 (기존 검색어가 남아있으면 빈 화면이 뜰 수 있음)
        const originalSearch = document.getElementById('world_info_search');
        const wifmSearch = document.getElementById('wifm-world-info-entry-search');
        
        if (originalSearch) {
            originalSearch.value = '';
            // ST가 jQuery 이벤트를 사용하므로 trigger로 변경 알림
            $(originalSearch).trigger('input'); 
        }
        if (wifmSearch) wifmSearch.value = '';

        // 3. [수정됨] 명시적으로 loadWorldInfo 호출하여 데이터 로드
        // 단순히 Dropdown 값만 변경하면 로드가 누락될 수 있으므로 직접 호출합니다.
        try {
            const success = await loadWorldInfo(name); // script/world-info.js에서 가져온 함수

            if (success) {
                // 로드 성공 시, 숨겨진 Core Dropdown 상태 동기화 (ST 내부 로직 꼬임 방지)
                if (coreEditorSelect) {
                    const optionToSelect = Array.from(coreEditorSelect.options).find(opt => opt.text === name);
                    if (optionToSelect) {
                        coreEditorSelect.value = optionToSelect.value;
                        // 이미 로드했으므로 UI 갱신을 위해 change 트리거
                        $(coreEditorSelect).trigger('change');
                    }
                }

                // 4. 확장 기능 상태 동기화 및 UI 갱신
                this._currentWorldName = name;
                this.updateSelectedLorebookName(name);
                
                // 탐색기(왼쪽 패널)의 선택된 아이콘 하이라이트 갱신
                this.renderExplorerView();
            } else {
                console.error(`[WIFM] World Info '${name}' 로드 실패`);
            }
        } catch (error) {
            console.error(`[WIFM] loadLorebook 실행 중 오류:`, error);
        }
    },

    
    triggerLoadLorebook: async function(name) {
        logger.log(`Trying to load WI: ${name}`);
        const coreEditorSelect = document.getElementById('world_editor_select');
        
        if (!coreEditorSelect) {
            console.error('Core Editor Select not found');
            return;
        }

        
        const optionToSelect = Array.from(coreEditorSelect.options).find(opt => opt.text === name);
        if (!optionToSelect) {
            console.warn(`Option for ${name} not found in dropdown`);
            return;
        }

        
        const success = await loadWorldInfo(name); 
        
        if (success) {
            
            coreEditorSelect.value = optionToSelect.value;
            $(coreEditorSelect).trigger('change');
            
            this.updateSelectedLorebookName(name);
            
            
            this.toggleExplorer(false);
            this.refreshLorebookUI();
        } else {
            alert(`World Info '${name}' 로드 실패`);
        }
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
        if(btn) btn.textContent = `이동 (${this._selectedItems.size})`;
    },
    updateSelectedLorebookName: function(name) {
        const el = document.getElementById('wifm-selected-lorebook-name');
        if(el) el.textContent = name || 'None';
    },
    updateActiveWorldInfoList: function() {
        const sel = document.getElementById('world_info');
        const el = document.getElementById('wifm-active-list-content');
        if(sel && el) {
            const names = Array.from(sel.selectedOptions).map(o=>o.text);
            el.textContent = names.length ? names.join(', ') : 'None';
        }
    },
    
    loadFolderState: function() {
        try {
            const state = accountStorage.getItem(this.storageKey);
            this.folderState = state ? JSON.parse(state) : {};
            if (!this.folderState['Unassigned']) this.folderState['Unassigned'] = { isOpen: true, items: [] };
        } catch (e) { this.folderState = {}; }
    },
    saveFolderState: function() {
        accountStorage.setItem(this.storageKey, JSON.stringify(this.folderState));
    },
    findFolderForLorebook: function(lorebookName) {
        for (const folderName in this.folderState) {
            if (this.folderState[folderName].items.includes(lorebookName)) return folderName;
        }
        return null;
    },
    createNewFolder: function() {
        const folderName = prompt('새 폴더 이름:');
        if (folderName && folderName.trim()) {
            const trimmedName = folderName.trim();
            if (this.folderState[trimmedName]) return alert('이미 존재함');
            this.folderState[trimmedName] = { isOpen: true, items: [] };
            this.saveFolderState();
            this.refreshLorebookUI();
        }
    },
    deleteFolder: function(folderName) {
        if (confirm(`폴더 '${folderName}' 삭제? (내용물은 유지됨)`)) {
            delete this.folderState[folderName];
            this.saveFolderState();
            this.refreshLorebookUI();
        }
    },
    showFolderMovePopup: function() {
        
        if (this._selectedItems.size === 0) return alert('선택된 항목 없음');
        
        
        const overlay = document.createElement('div');
        overlay.className = 'wifm-popup-overlay';
        const content = document.createElement('div');
        content.className = 'wifm-popup-content';
        content.innerHTML = '<h3>폴더로 이동</h3>';
        
        const list = document.createElement('div');
        list.style.cssText = 'max-height: 300px; overflow-y: auto; margin: 10px 0; display: flex; flex-direction: column; gap: 5px;';
        
        const folders = Object.keys(this.folderState).filter(n => n!=='Unassigned').sort();
        folders.push('Unassigned');
        
        folders.forEach(f => {
            const btn = document.createElement('div');
            btn.className = 'menu_button';
            btn.textContent = f === 'Unassigned' ? '📂 폴더 없음' : `📁 ${f}`;
            btn.style.justifyContent = 'flex-start';
            btn.onclick = () => {
                this._selectedItems.forEach(wi => this.moveLorebookToFolder(wi, f));
                this.toggleMoveMode(false);
                overlay.remove();
                alert('이동 완료');
                this.refreshLorebookUI();
            };
            list.appendChild(btn);
        });
        
        const close = document.createElement('button');
        close.className = 'menu_button redWarningBG';
        close.textContent = '취소';
        close.style.width = '100%';
        close.onclick = () => overlay.remove();
        
        content.appendChild(list);
        content.appendChild(close);
        overlay.appendChild(content);
        document.body.appendChild(overlay);
    },
    moveLorebookToFolder: function(lorebookName, targetFolderName) {
        
        for (const f in this.folderState) {
            const idx = this.folderState[f].items.indexOf(lorebookName);
            if (idx > -1) this.folderState[f].items.splice(idx, 1);
        }
        
        if (targetFolderName !== 'Unassigned') {
             if(!this.folderState[targetFolderName]) this.folderState[targetFolderName] = {items:[]};
             this.folderState[targetFolderName].items.push(lorebookName);
        }
        this.saveFolderState();
    },
    setupCharacterWorldInfoPopupObserver: function() {
        const self = this;
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const dialog = (node.matches && node.matches('dialog.popup')) ? node : node.querySelector('dialog.popup');
                            if (dialog && (dialog.querySelector('.character_world') || dialog.querySelector('.persona_world'))) {
                                self.enhanceWorldInfoPopup(dialog);
                            }
                        }
                    });
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        logger.log('Character World Info 팝업 감지 옵저버 시작.');
    },

    enhanceWorldInfoPopup: function(dialog) {
        const selector = dialog.querySelector('.character_world_info_selector') || dialog.querySelector('.persona_world_info_selector');
        if (!selector) {
            logger.warn('World Info 팝업 셀렉터(Character/Persona)를 찾지 못했습니다.');
            return;
        }
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
        searchInput.style.width = '100%';
        searchInput.style.marginBottom = '5px';
        searchInput.style.boxSizing = 'border-box';
        selector.parentNode.insertBefore(searchInput, selector);
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            Array.from(selector.options).forEach(opt => {
                const isNone = opt.value === '';
                const isRecommended = opt.dataset.isRecommended === 'true';
                const text = opt.textContent.toLowerCase();
                opt.style.display = (isNone || isRecommended || text.includes(searchTerm)) ? '' : 'none';
            });
        });
        logger.log('Character World Info 팝업에 추천 항목 및 검색창 추가 완료.');
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
                 logger.error('WorldInfo 패널 또는 #world_info 요소를 찾을 수 없습니다. UI를 주입할 수 없습니다.');
                 
                 setTimeout(initExtension, 1000);
            }
        }
    };
    
    
    initExtension();
    
    
    
    WorldInfoFolderMove.setupCharacterWorldInfoPopupObserver();
});