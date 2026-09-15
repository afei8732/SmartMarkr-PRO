(() => {
  'use strict';

  const state = {
    lastUndo: null,
    trashId: null,
    duplicateGroups: [],
    duplicateFolderGroups: [],
    emptyFolders: [],
    archiveGroups: [],
    archivePaging: {},
    archiveItemTargets: {},
    archiveFolderOptions: [],
    archiveKeywordFilter: '',
    archiveGroupFilterText: '',
    archiveGroupSelections: [],
    archiveFilterOptions: [],
    archiveBookmarks: [],
    archiveMode: 'domain',
    archiveNaming: 'zh',
    archiveGroupKeys: [],
    brokenPaging: {},
    currentPreviewUrl: null,
    brokenBookmarks: [],
    language: 'zh',
    // 暂停检测相关状态
    brokenScanPaused: false,
    brokenScanRunning: false
  };
  const TRASH_TITLE = '❌ 书签回收站';
  const ARCHIVE_OTHER_LABEL = '\u{1F4CC} 其他';
  const LEGACY_TRASH_TITLE = 'SmartBookmark 回收站';
  const DEFAULT_SETTINGS = {
    theme: 'dark',
    language: 'zh',
    resultsColumns: 3,
    duplicate: {
      exact: true,
      similar: true,
      threshold: 0.8,
      smartRule: 'oldest'
    },
    broken: {
      empty: true,
      invalid: true,
      timeout: true,
      status: true,
      timeoutSeconds: 8,
      concurrency: 4
    },
    archive: {
      mode: 'domain',
      minGroupSize: 2,
      naming: 'zh'
    },
    ai: {
      baseUrl: 'http://192.168.3.176:8787/v1',
      apiKey: '',
      model: '',
      batchSize: 25,
      concurrency: 2
    }
  };

  const I18N = {
    zh: {
      app_title: 'SmartMarkr 智签管家',
      app_subtitle: '智能书签管理：重复检测 / 空文件夹 / 智能归档',
      nav_search: '书签搜索',
      nav_duplicates: '重复书签',
      nav_dup_folders: '重复文件夹',
      nav_empty_folders: '空文件夹',
      nav_broken: '异常书签',
      nav_archive: '书签归档',
      nav_transfer: '导入导出',
      nav_snapshots: '快照备份',
      search_title: '书签搜索',
      search_input_label: '请输入关键词、URL或三选项',
      search_input_placeholder: '输入关键词、URL或选三选择',
      search_btn: '搜索',
      validate_btn: '验证',
      search_title_option: '标题',
      search_url_option: 'URL',
      search_text_only: '仅文本小写',
      search_hint: '未搜索到符合条件的书签',
      search_result_found: '找到 {count} 个符合条件的书签',
      search_validating: '正在验证链接...',
      search_validation_complete: '验证完成：{valid} 个有效，{invalid} 个无效',
      refresh_data: '刷新数据',
      clear_trash: '清空回收站',
      results_columns: '结果列数',
      settings: '设置',
      undo: '撤销上一步',
      dup_title: '重复书签整理',
      dup_folder_title: '重复文件夹整理',
      empty_folder_title: '空文件夹清理',
      broken_title: '异常书签整理',
      archive_title: '书签归档',
      transfer_title: '导入 / 导出',
      snapshot_title: '快照备份',
      snapshot_desc: '每次批量删除或归档前会自动生成完整书签树快照，保留最近 5 份，可随时还原或导出。',
      snapshot_create: '立即创建快照',
      snapshot_refresh: '刷新列表',
      snapshot_clear: '清空快照',
      transfer_desc: '轻松导入或导出你的书签和标签页数据。',
      export_title: '导出',
      export_bookmarks: '导出书签',
      export_tabs: '导出标签页',
      export_filename: '文件名',
      export_format: '格式',
      export_filename_placeholder: 'bookmark-export-2026-01-21',
      export_json: '导出为JSON',
      export_run: '导出',
      export_copy: '复制到剪贴板',
      export_no_selection: '请至少选择书签或标签页。',
      export_done: '导出完成：{bookmarks} 个书签，{tabs} 个标签页。',
      export_copy_done: '已复制到剪贴板。',
      export_failed: '导出失败：{message}',
      export_tabs_permission: '无法读取标签页（缺少权限）。',
      import_title: '导入',
      import_file: '选择文件',
      import_bookmarks: '导入书签',
      import_tabs: '导入标签页',
      import_target: '导入到',
      import_conflict: '重复处理',
      import_conflict_skip: '跳过已存在（推荐）',
      import_conflict_duplicate: '仍然创建副本',
      import_conflict_overwrite: '覆盖同链接书签',
      import_tabs_open: '打开导入的标签页',
      import_tabs_bookmark: '将标签页保存为书签',
      import_run: '开始导入',
      import_clear: '清空选择',
      import_no_selection: '请至少选择书签或标签页。',
      import_no_file: '请先选择导入文件。',
      import_invalid_file: '文件格式无效，无法解析。',
      import_no_data: '文件中没有可导入的数据。',
      import_failed: '导入失败：{message}',
      import_done: '导入完成：{bookmarks} 个书签，{tabs} 个标签页。',
      import_tabs_confirm: '即将打开 {count} 个标签页，确认继续吗？',
      scan: '开始扫描',
      detect: '开始检测',
      refresh: '刷新',
      collapse: '折叠',
      expand: '展开',
      apply: '应用',
      select_all: '全选',
      delete_selected: '删除选中',
      delete_direct: '直接删除',
      quick_keep_oldest: '快捷：保留最久',
      quick_keep_newest: '快捷：保留最新',
      quick_keep_longest_url: '快捷：保留URL最长',
      dup_exact: '完全重复（URL相同）',
      dup_similar: '相似网页（标题/路径相似）',
      similarity_threshold: '相似度阈值',
      smart_rule: '智能选择规则',
      keep_oldest: '保留最久（最早添加）',
      keep_newest: '保留最新（最近添加）',
      keep_longest_url: '保留URL最长',
      keep_shortest_url: '保留URL最短',
      keep_longest_title: '保留标题最长',
      keep_shortest_title: '保留标题最短',
      broken_empty: '空链接',
      broken_invalid: '无效URL',
      broken_timeout: '超时',
      broken_status: '状态码异常（>=400）',
      timeout_seconds: '超时（秒）',
      concurrency: '并发数',
      preview_generate: '生成预览',
      archive_by_domain: '按域名归档',
      archive_by_type: '按类型归档',
      archive_by_custom: '按用户文件夹归档',
      archive_by_ai: 'AI 智能分类归档',
      archive_by_date: '按添加时间归档',
      archive_min_group: '最小分组数量',
      archive_naming: '分组命名语言',
      archive_naming_zh: '中文',
      archive_naming_en: 'English',
      archive_naming_both: '中文（English）',
      ai_config_title: 'AI 配置',
      ai_base_url: '接口地址',
      ai_api_key: 'API Key',
      ai_model: '模型',
      ai_test: '测试连接',
      ai_refresh_models: '拉取模型',
      ai_save: '保存配置',
      ai_clear: '清除配置',
      ai_base_url_placeholder: 'http://192.168.3.176:8787/v1',
      ai_api_key_placeholder: 'sk-...',
      archive_root: '归档根目录',
      refresh_folders: '刷新目录',
      archive_new_root: '新建归档根目录',
      archive_new_root_placeholder: '输入新文件夹名称',
      create_and_select: '创建并选中',
      filter_groups: '选择分组',
      filter_groups_placeholder: '选择分组',
      all_groups: '全部分组',
      keyword_filter: '关键词筛选',
      keyword_filter_placeholder: '标题或URL关键词',
      refresh_groups: '刷新目录',
      bulk_archive_to: '筛选归档到',
      apply_to_filtered: '应用到筛选结果',
      run_archive: '执行归档',
      settings_title: '功能设置',
      settings_general: '常规设置',
      settings_duplicates: '重复书签默认',
      settings_broken: '异常书签默认',
      settings_archive: '归档默认',
      theme: '主题',
      theme_dark: '黑色',
      theme_light: '白色',
      theme_auto: '跟随系统',
      language: '语言',
      cancel: '取消',
      save: '保存',
      close: '关闭',
      open_new_tab: '新标签打开',
      preview: '预览',
      preview_hint: '如果页面无法显示，请点击“新标签打开”。',
      archive_mode: '归档方式',
      dup_type_exact: '完全重复',
      dup_type_similar: '相似网页',
      dup_group_title: '{type} - 组 {index}（{count} 项）',
      dup_folder_group_title: '重复文件夹组 {index}（{count} 项）',
      empty_group_title: '空文件夹（{count} 个）',
      no_duplicates: '未发现重复书签',
      no_dup_folders: '未发现重复文件夹',
      no_empty_folders: '未发现空文件夹',
      no_broken: '未发现异常书签',
      no_archive: '暂无可归档书签',
      warn_group_too_large: '{host} 分组过大（{count}），已跳过相似检测',
      tips: '提示',
      path: '路径',
      recommended_keep: '(推荐保留)',
      reason: '原因',
      empty_link: '(空链接)',
      checking: '检测中：{done}/{total}',
      checking_ready: '准备检测...',
      checked_done: '检测完成：{total}/{total}',
      checked_none: '没有可检测的书签',
      confirm_clear_trash: '确定要清空回收站吗？此操作无法撤销。',
      confirm_delete_direct_bookmarks: '确定直接删除选中的书签吗？此操作无法撤销。',
      confirm_delete_direct_folders: '确定直接删除选中的文件夹吗？此操作无法撤销。',
      confirm_delete_direct_empty: '确定直接删除选中的空文件夹吗？此操作无法撤销。',
      confirm_delete_direct_broken: '确定直接删除选中的异常书签吗？此操作无法撤销。'
      ,
      undo_delete_duplicates: '删除重复书签',
      undo_delete_dup_folders: '删除重复文件夹',
      undo_delete_empty_folders: '删除空文件夹',
      undo_delete_broken: '删除异常书签',
      undo_archive: '书签归档',
      archive_move_to: '归档到',
      page_size: '每页',
      page: '页码',
      prev: '上一页',
      next: '下一页',
      archive_items: '项',
      pause: '⏸ 暂停',
      resume: '▶ 继续',
      paused: '已暂停',
      // 打赏相关
      donate_btn: '❤️ 打赏',
      donate_title: '支持开发者',
      donate_desc: '如果您觉得这个工具对您有帮助，欢迎打赏支持开发者继续改进！',
      donate_wechat: '微信支付',
      donate_alipay: '支付宝',
      donate_thanks: '感谢您的支持！',
      donate_success_message: '感谢您的支持！祝您使用愉快！'
    },
    en: {
      app_title: 'SmartMarkr',
      app_subtitle: 'Smart Bookmark Manager: Duplicates / Empty Folders / Archive',
      nav_search: 'Bookmark Search',
      nav_duplicates: 'Duplicates',
      nav_dup_folders: 'Duplicate Folders',
      nav_empty_folders: 'Empty Folders',
      nav_broken: 'Invalid Links',
      nav_archive: 'Archive',
      nav_transfer: 'Import/Export',
      nav_snapshots: 'Snapshots',
      search_title: 'Bookmark Search',
      search_input_label: 'Enter keyword, URL or options',
      search_input_placeholder: 'Enter keyword, URL or select options',
      search_btn: 'Search',
      validate_btn: 'Validate',
      search_title_option: 'Title',
      search_url_option: 'URL',
      search_text_only: 'Text lowercase only',
      search_hint: 'No bookmarks found matching your criteria',
      search_result_found: 'Found {count} matching bookmark(s)',
      search_validating: 'Validating links...',
      search_validation_complete: 'Validation complete: {valid} valid, {invalid} invalid',
      refresh_data: 'Refresh',
      clear_trash: 'Empty Trash',
      results_columns: 'Columns',
      settings: 'Settings',
      undo: 'Undo',
      dup_title: 'Duplicate Bookmarks',
      dup_folder_title: 'Duplicate Folders',
      empty_folder_title: 'Empty Folders',
      broken_title: 'Invalid Bookmarks',
      archive_title: 'Archive',
      transfer_title: 'Import / Export',
      snapshot_title: 'Snapshots',
      snapshot_desc: 'A full bookmark-tree snapshot is captured before every bulk delete or archive. The 5 most recent are kept and can be restored or exported at any time.',
      snapshot_create: 'Create snapshot now',
      snapshot_refresh: 'Refresh list',
      snapshot_clear: 'Clear snapshots',
      transfer_desc: 'Easily import or export your bookmarks and tab data.',
      export_title: 'Export',
      export_bookmarks: 'Export bookmarks',
      export_tabs: 'Export tabs',
      export_filename: 'File name',
      export_format: 'Format',
      export_filename_placeholder: 'bookmark-export-2026-01-21',
      export_json: 'Export JSON',
      export_run: 'Export',
      export_copy: 'Copy to clipboard',
      export_no_selection: 'Select at least bookmarks or tabs.',
      export_done: 'Exported: {bookmarks} bookmarks, {tabs} tabs.',
      export_copy_done: 'Copied to clipboard.',
      export_failed: 'Export failed: {message}',
      export_tabs_permission: 'Cannot read tabs (permission missing).',
      import_title: 'Import',
      import_file: 'Choose file',
      import_bookmarks: 'Import bookmarks',
      import_tabs: 'Import tabs',
      import_target: 'Import to',
      import_conflict: 'Duplicates',
      import_conflict_skip: 'Skip existing (recommended)',
      import_conflict_duplicate: 'Create duplicates',
      import_conflict_overwrite: 'Overwrite same URL',
      import_tabs_open: 'Open imported tabs',
      import_tabs_bookmark: 'Save tabs as bookmarks',
      import_run: 'Start import',
      import_clear: 'Clear selection',
      import_no_selection: 'Select at least bookmarks or tabs.',
      import_no_file: 'Please select a file to import.',
      import_invalid_file: 'Invalid file format.',
      import_no_data: 'No data to import in this file.',
      import_failed: 'Import failed: {message}',
      import_done: 'Imported: {bookmarks} bookmarks, {tabs} tabs.',
      import_tabs_confirm: 'Open {count} tabs now?',
      scan: 'Scan',
      detect: 'Detect',
      refresh: 'Refresh',
      collapse: 'Collapse',
      expand: 'Expand',
      apply: 'Apply',
      select_all: 'Select All',
      delete_selected: 'Delete Selected',
      delete_direct: 'Delete Direct',
      quick_keep_oldest: 'Quick: Keep Oldest',
      quick_keep_newest: 'Quick: Keep Newest',
      quick_keep_longest_url: 'Quick: Keep Longest URL',
      dup_exact: 'Exact (same URL)',
      dup_similar: 'Similar (title/path)',
      similarity_threshold: 'Similarity Threshold',
      smart_rule: 'Smart Rule',
      keep_oldest: 'Keep oldest (earliest)',
      keep_newest: 'Keep newest (latest)',
      keep_longest_url: 'Keep longest URL',
      keep_shortest_url: 'Keep shortest URL',
      keep_longest_title: 'Keep longest title',
      keep_shortest_title: 'Keep shortest title',
      broken_empty: 'Empty link',
      broken_invalid: 'Invalid URL',
      broken_timeout: 'Timeout',
      broken_status: 'Bad status (>=400)',
      timeout_seconds: 'Timeout (s)',
      concurrency: 'Concurrency',
      preview_generate: 'Preview',
      archive_by_domain: 'By domain',
      archive_by_type: 'By type',
      archive_by_custom: 'By folders',
      archive_by_ai: 'AI smart categories',
      archive_by_date: 'By date added',
      archive_min_group: 'Minimum group size',
      archive_naming: 'Folder name language',
      archive_naming_zh: 'Chinese',
      archive_naming_en: 'English',
      archive_naming_both: 'Chinese (English)',
      ai_config_title: 'AI configuration',
      ai_base_url: 'Endpoint',
      ai_api_key: 'API key',
      ai_model: 'Model',
      ai_test: 'Test connection',
      ai_refresh_models: 'Fetch models',
      ai_save: 'Save',
      ai_clear: 'Clear',
      ai_base_url_placeholder: 'http://192.168.3.176:8787/v1',
      ai_api_key_placeholder: 'sk-...',
      archive_root: 'Archive root',
      refresh_folders: 'Refresh folders',
      archive_new_root: 'New archive root',
      archive_new_root_placeholder: 'Folder name',
      create_and_select: 'Create & select',
      filter_groups: 'Select groups',
      filter_groups_placeholder: 'Select groups',
      all_groups: 'All groups',
      keyword_filter: 'Keyword filter',
      keyword_filter_placeholder: 'Title or URL keyword',
      refresh_groups: 'Refresh groups',
      bulk_archive_to: 'Archive filtered to',
      apply_to_filtered: 'Apply to filtered',
      run_archive: 'Run archive',
      settings_title: 'Settings',
      settings_general: 'General',
      settings_duplicates: 'Duplicate defaults',
      settings_broken: 'Invalid defaults',
      settings_archive: 'Archive defaults',
      theme: 'Theme',
      theme_dark: 'Dark',
      theme_light: 'Light',
      theme_auto: 'System',
      language: 'Language',
      cancel: 'Cancel',
      save: 'Save',
      close: 'Close',
      open_new_tab: 'Open in new tab',
      preview: 'Preview',
      preview_hint: 'If the page cannot be displayed, click “Open in new tab”.',
      archive_mode: 'Archive mode',
      dup_type_exact: 'Exact',
      dup_type_similar: 'Similar',
      dup_group_title: '{type} - Group {index} ({count})',
      dup_folder_group_title: 'Duplicate folder group {index} ({count})',
      empty_group_title: 'Empty folders ({count})',
      no_duplicates: 'No duplicate bookmarks',
      no_dup_folders: 'No duplicate folders',
      no_empty_folders: 'No empty folders',
      no_broken: 'No invalid bookmarks',
      no_archive: 'No bookmarks to archive',
      warn_group_too_large: 'Group too large for {host} ({count}), skipped similarity check',
      tips: 'Tips',
      path: 'Path',
      recommended_keep: '(Recommended)',
      reason: 'Reason',
      empty_link: '(Empty link)',
      checking: 'Checking: {done}/{total}',
      checking_ready: 'Preparing...',
      checked_done: 'Completed: {total}/{total}',
      checked_none: 'No bookmarks to check',
      confirm_clear_trash: 'Empty trash now? This cannot be undone.',
      confirm_delete_direct_bookmarks: 'Delete selected bookmarks directly? This cannot be undone.',
      confirm_delete_direct_folders: 'Delete selected folders directly? This cannot be undone.',
      confirm_delete_direct_empty: 'Delete selected empty folders directly? This cannot be undone.',
      confirm_delete_direct_broken: 'Delete selected invalid bookmarks directly? This cannot be undone.'
      ,
      undo_delete_duplicates: 'Delete duplicate bookmarks',
      undo_delete_dup_folders: 'Delete duplicate folders',
      undo_delete_empty_folders: 'Delete empty folders',
      undo_delete_broken: 'Delete invalid bookmarks',
      undo_archive: 'Archive bookmarks',
      archive_move_to: 'Move to',
      page_size: 'Per page',
      page: 'Page',
      prev: 'Prev',
      next: 'Next',
      archive_items: 'items',
      pause: '⏸ Pause',
      resume: '▶ Resume',
      paused: 'Paused',
      // Donate related
      donate_btn: '❤️ Donate',
      donate_title: 'Support Developer',
      donate_desc: 'If you find this tool helpful, please consider supporting the developer!',
      donate_wechat: 'WeChat Pay',
      donate_alipay: 'Alipay',
      donate_thanks: 'Thank you for your support!',
      donate_success_message: 'Thank you for your support! Enjoy using the app!'
    }
  };

  const elements = {
    similarityThreshold: document.getElementById('similarity-threshold'),
    similarityValue: document.getElementById('similarity-value'),
    scanDuplicates: document.getElementById('scan-duplicates'),
    refreshDuplicates: document.getElementById('refresh-duplicates'),
    dupExact: document.getElementById('dup-exact'),
    dupSimilar: document.getElementById('dup-similar'),
    dupSmartRule: document.getElementById('dup-smart-rule'),
    dupSmartApply: document.getElementById('dup-smart-apply'),
    dupResults: document.getElementById('duplicate-results'),
    dupSelectAll: document.getElementById('dup-select-all'),
    dupDelete: document.getElementById('dup-delete'),
    dupDeleteDirect: document.getElementById('dup-delete-direct'),
    dupSmartOldest: document.getElementById('dup-smart-oldest'),
    dupSmartNewest: document.getElementById('dup-smart-newest'),
    dupSmartLongestUrl: document.getElementById('dup-smart-longest-url'),

    scanDupFolders: document.getElementById('scan-dup-folders'),
    refreshDupFolders: document.getElementById('refresh-dup-folders'),
    dupFolderResults: document.getElementById('duplicate-folder-results'),
    dupFolderSelectAll: document.getElementById('dup-folder-select-all'),
    dupFolderDelete: document.getElementById('dup-folder-delete'),
    dupFolderDeleteDirect: document.getElementById('dup-folder-delete-direct'),

    scanEmptyFolders: document.getElementById('scan-empty-folders'),
    refreshEmptyFolders: document.getElementById('refresh-empty-folders'),
    emptyFolderResults: document.getElementById('empty-folder-results'),
    emptyFolderSelectAll: document.getElementById('empty-folder-select-all'),
    emptyFolderDelete: document.getElementById('empty-folder-delete'),
    emptyFolderDeleteDirect: document.getElementById('empty-folder-delete-direct'),

    scanBroken: document.getElementById('scan-broken'),
    refreshBroken: document.getElementById('refresh-broken'),
    refreshBrokenAction: document.getElementById('refresh-broken-action'),
    brokenResults: document.getElementById('broken-results'),
    brokenSelectAll: document.getElementById('broken-select-all'),
    brokenDelete: document.getElementById('broken-delete'),
    brokenDeleteDirect: document.getElementById('broken-delete-direct'),
    brokenEmpty: document.getElementById('broken-empty'),
    brokenInvalid: document.getElementById('broken-invalid'),
    brokenTimeout: document.getElementById('broken-timeout'),
    brokenStatus: document.getElementById('broken-status'),
    brokenTimeoutSeconds: document.getElementById('broken-timeout-seconds'),
    brokenConcurrency: document.getElementById('broken-concurrency'),
    brokenProgress: document.getElementById('broken-progress'),
    brokenProgressBar: document.getElementById('broken-progress-bar'),
    brokenProgressText: document.getElementById('broken-progress-text'),

    archivePreview: document.getElementById('archive-preview'),
    archiveResults: document.getElementById('archive-results'),
    archiveSelectAll: document.getElementById('archive-select-all'),
    archiveRun: document.getElementById('archive-run'),
    archiveRoot: document.getElementById('archive-root'),
    archiveNewRoot: document.getElementById('archive-new-root'),
    archiveCreateRoot: document.getElementById('archive-create-root'),
    archiveFilter: document.getElementById('archive-filter'),
    archiveFilterRefresh: document.getElementById('archive-filter-refresh'),
    archiveFilterChecks: document.getElementById('archive-filter-checks'),
    archiveKeywordFilter: document.getElementById('archive-keyword-filter'),
    archiveBulkTarget: document.getElementById('archive-bulk-target'),
    archiveApplyFiltered: document.getElementById('archive-apply-filtered'),
    archiveMinGroup: document.getElementById('archive-min-group'),
    archiveNaming: document.getElementById('archive-naming'),

    aiConfigPanel: document.getElementById('ai-config-panel'),
    aiBaseUrl: document.getElementById('ai-base-url'),
    aiApiKey: document.getElementById('ai-api-key'),
    aiModel: document.getElementById('ai-model'),
    aiTest: document.getElementById('ai-test'),
    aiRefreshModels: document.getElementById('ai-refresh-models'),
    aiSave: document.getElementById('ai-save'),
    aiClear: document.getElementById('ai-clear'),
    aiStatus: document.getElementById('ai-status'),
    refreshFolders: document.getElementById('refresh-folders'),

    exportBookmarks: document.getElementById('export-bookmarks'),
    exportTabs: document.getElementById('export-tabs'),
    exportFilename: document.getElementById('export-filename'),
    exportFormat: document.getElementById('export-format'),
    exportBtn: document.getElementById('export-btn'),
    exportCopy: document.getElementById('export-copy'),
    exportResult: document.getElementById('export-result'),
    importFile: document.getElementById('import-file'),
    importBookmarks: document.getElementById('import-bookmarks'),
    importTabs: document.getElementById('import-tabs'),
    importTarget: document.getElementById('import-target'),
    importConflict: document.getElementById('import-conflict'),
    importTabsOpen: document.getElementById('import-tabs-open'),
    importTabsBookmark: document.getElementById('import-tabs-bookmark'),
    importRun: document.getElementById('import-run'),
    importClear: document.getElementById('import-clear'),
    importResult: document.getElementById('import-result'),

    refreshBtn: document.getElementById('refresh-btn'),
    clearTrashBtn: document.getElementById('clear-trash-btn'),
    undoBtn: document.getElementById('undo-btn'),
    undoLabel: document.getElementById('undo-label'),
    resultsColumns: document.getElementById('results-columns'),
    openSettings: document.getElementById('open-settings'),
    settingsModal: document.getElementById('settings-modal'),
    settingsClose: document.getElementById('settings-close'),
    settingsCancel: document.getElementById('settings-cancel'),
    settingsSave: document.getElementById('settings-save'),
    settingsBackdrop: document.querySelector('#settings-modal .settings-backdrop'),
    settingTheme: document.getElementById('setting-theme'),
    settingLanguage: document.getElementById('setting-language'),
    settingColumns: document.getElementById('setting-columns'),
    settingDupExact: document.getElementById('setting-dup-exact'),
    settingDupSimilar: document.getElementById('setting-dup-similar'),
    settingSimilarity: document.getElementById('setting-similarity'),
    settingSimilarityValue: document.getElementById('setting-similarity-value'),
    settingSmartRule: document.getElementById('setting-smart-rule'),
    settingBrokenEmpty: document.getElementById('setting-broken-empty'),
    settingBrokenInvalid: document.getElementById('setting-broken-invalid'),
    settingBrokenTimeout: document.getElementById('setting-broken-timeout'),
    settingBrokenStatus: document.getElementById('setting-broken-status'),
    settingBrokenTimeoutSeconds: document.getElementById('setting-broken-timeout-seconds'),
    settingBrokenConcurrency: document.getElementById('setting-broken-concurrency'),
    settingArchiveMode: document.getElementById('setting-archive-mode'),
    scrollTopBtn: document.getElementById('scroll-top'),
    scrollBottomBtn: document.getElementById('scroll-bottom'),
    previewModal: document.getElementById('preview-modal'),
    previewFrame: document.getElementById('preview-frame'),
    previewUrl: document.getElementById('preview-url'),

    snapshotCreate: document.getElementById('snapshot-create'),
    snapshotRefresh: document.getElementById('snapshot-refresh'),
    snapshotClear: document.getElementById('snapshot-clear'),
    snapshotResult: document.getElementById('snapshot-result'),
    snapshotResults: document.getElementById('snapshot-results'),
    previewClose: document.getElementById('preview-close'),
    previewBackdrop: document.querySelector('#preview-modal .preview-backdrop'),
    previewOpenTab: document.getElementById('preview-open-tab'),

    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    validateBtn: document.getElementById('validate-btn'),
    searchTitle: document.getElementById('search-title'),
    searchUrl: document.getElementById('search-url'),
    searchTextOnly: document.getElementById('search-text-only'),
    searchResults: document.getElementById('search-results'),
    searchResultStats: document.getElementById('search-result-stats')
  };

  function setUndo(label, moves) {
    state.lastUndo = { label, moves };
    elements.undoBtn.disabled = !moves || moves.length === 0;
    elements.undoLabel.textContent = moves && moves.length ? `可撤销：${label}` : '';
  }

  function clearUndo() {
    state.lastUndo = null;
    elements.undoBtn.disabled = true;
    elements.undoLabel.textContent = '';
  }

  const AutoBackup = (function () {
    const engine = (typeof globalThis !== 'undefined' && globalThis.SMBackup) || null;
    return {
      enabled: true,
      available() { return !!engine; },
      async capture(action, details) {
        if (!this.enabled || !engine) return null;
        try {
          const { tree } = await getAllData();
          return await engine.createSnapshot(tree, action, details || {});
        } catch (error) {
          console.warn('snapshot failed', error);
          return null;
        }
      }
    };
  })();

  function updateSimilarityLabel() {
    const value = Number(elements.similarityThreshold.value || 0.8).toFixed(2);
    elements.similarityValue.textContent = value;
  }

  function t(key, vars = {}) {
    const dict = I18N[state.language] || I18N.zh;
    let text = dict[key] || key;
    return text.replace(/\{(\w+)\}/g, (_, name) => (vars[name] !== undefined ? vars[name] : ''));
  }

  function applyI18n() {
    const dict = I18N[state.language] || I18N.zh;
    document.documentElement.lang = state.language === 'en' ? 'en' : 'zh-CN';
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) {
        el.setAttribute('placeholder', dict[key]);
      }
    });
    document.querySelectorAll('.collapse-btn').forEach(btn => {
      const target = document.getElementById(btn.dataset.target);
      if (target && target.classList.contains('collapsed')) {
        btn.textContent = t('expand');
      } else {
        btn.textContent = t('collapse');
      }
    });
    if (state.archiveGroups.length) {
      updateArchiveFilterOptions();
    }
  }

  function loadSettings() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem('appSettings') || '{}');
    } catch {
      saved = {};
    }
    if (saved.resultsColumns === undefined) {
      const legacy = Number(localStorage.getItem('resultsColumns'));
      if (!Number.isNaN(legacy) && legacy > 0) {
        saved.resultsColumns = legacy;
      }
    }

    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      duplicate: { ...DEFAULT_SETTINGS.duplicate, ...(saved.duplicate || {}) },
      broken: { ...DEFAULT_SETTINGS.broken, ...(saved.broken || {}) },
      archive: { ...DEFAULT_SETTINGS.archive, ...(saved.archive || {}) }
    };
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem('appSettings', JSON.stringify(settings));
    } catch {
      // ignore storage errors
    }
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
  }

  function applySettingsToUI(settings) {
    // duplicates
    elements.dupExact.checked = settings.duplicate.exact;
    elements.dupSimilar.checked = settings.duplicate.similar;
    elements.similarityThreshold.value = settings.duplicate.threshold;
    updateSimilarityLabel();
    elements.dupSmartRule.value = settings.duplicate.smartRule;

    // broken defaults
    elements.brokenEmpty.checked = settings.broken.empty;
    elements.brokenInvalid.checked = settings.broken.invalid;
    elements.brokenTimeout.checked = settings.broken.timeout;
    elements.brokenStatus.checked = settings.broken.status;
    elements.brokenTimeoutSeconds.value = settings.broken.timeoutSeconds;
    elements.brokenConcurrency.value = settings.broken.concurrency;

    // archive mode
    const mode = settings.archive.mode;
    const radio = document.querySelector(`input[name=\"archive-mode\"][value=\"${mode}\"]`);
    if (radio) radio.checked = true;
    if (elements.archiveMinGroup) elements.archiveMinGroup.value = settings.archive.minGroupSize || 2;
    if (elements.archiveNaming) elements.archiveNaming.value = settings.archive.naming || 'zh';

    setResultsColumns(settings.resultsColumns);
  }

  function applySettingsState(settings) {
    state.language = settings.language;
    applyTheme(settings.theme);
    applyI18n();
    applySettingsToUI(settings);
  }

  function openSettings() {
    const settings = loadSettings();
    elements.settingTheme.value = settings.theme;
    elements.settingLanguage.value = settings.language;
    elements.settingColumns.value = String(settings.resultsColumns);
    elements.settingDupExact.checked = settings.duplicate.exact;
    elements.settingDupSimilar.checked = settings.duplicate.similar;
    elements.settingSimilarity.value = settings.duplicate.threshold;
    elements.settingSimilarityValue.textContent = Number(settings.duplicate.threshold).toFixed(2);
    elements.settingSmartRule.value = settings.duplicate.smartRule;
    elements.settingBrokenEmpty.checked = settings.broken.empty;
    elements.settingBrokenInvalid.checked = settings.broken.invalid;
    elements.settingBrokenTimeout.checked = settings.broken.timeout;
    elements.settingBrokenStatus.checked = settings.broken.status;
    elements.settingBrokenTimeoutSeconds.value = settings.broken.timeoutSeconds;
    elements.settingBrokenConcurrency.value = settings.broken.concurrency;
    elements.settingArchiveMode.value = settings.archive.mode;
    elements.settingsModal.classList.remove('hidden');
  }

  function closeSettings() {
    elements.settingsModal.classList.add('hidden');
  }

  function collectSettingsFromModal() {
    return {
      theme: elements.settingTheme.value,
      language: elements.settingLanguage.value,
      resultsColumns: Number(elements.settingColumns.value),
      duplicate: {
        exact: elements.settingDupExact.checked,
        similar: elements.settingDupSimilar.checked,
        threshold: Number(elements.settingSimilarity.value),
        smartRule: elements.settingSmartRule.value
      },
      broken: {
        empty: elements.settingBrokenEmpty.checked,
        invalid: elements.settingBrokenInvalid.checked,
        timeout: elements.settingBrokenTimeout.checked,
        status: elements.settingBrokenStatus.checked,
        timeoutSeconds: Number(elements.settingBrokenTimeoutSeconds.value),
        concurrency: Number(elements.settingBrokenConcurrency.value)
      },
      archive: {
        mode: elements.settingArchiveMode.value
      }
    };
  }

  function getTree() {
    return new Promise((resolve) => {
      chrome.bookmarks.getTree((tree) => resolve(tree || []));
    });
  }

  function getChildren(id) {
    return new Promise((resolve) => {
      chrome.bookmarks.getChildren(id, (items) => resolve(items || []));
    });
  }

  function getNode(id) {
    return new Promise((resolve) => {
      chrome.bookmarks.get(id, (items) => resolve(items && items[0] ? items[0] : null));
    });
  }

  function moveNode(id, destination) {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.move(id, destination, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
  }

  function createBookmark(data) {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.create(data, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
  }

  function removeTree(id) {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.removeTree(id, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  function queryTabs() {
    return new Promise((resolve) => {
      if (!chrome.tabs || !chrome.tabs.query) {
        resolve({ tabs: [], error: new Error('tabs_api_unavailable') });
        return;
      }
      chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError) {
          resolve({ tabs: [], error: chrome.runtime.lastError });
        } else {
          resolve({ tabs: tabs || [], error: null });
        }
      });
    });
  }

  function createTab(url) {
    return new Promise((resolve) => {
      if (!chrome.tabs || !chrome.tabs.create) {
        resolve(false);
        return;
      }
      chrome.tabs.create({ url, active: false }, () => {
        resolve(!chrome.runtime.lastError);
      });
    });
  }

  async function moveSelectedToTrash(ids, label) {
    if (ids && ids.length) {
      await AutoBackup.capture(label || '批量操作', { count: ids.length, ids: ids.slice(0, 200) });
    }
    const tree = await getTree();
    const trashId = await ensureTrashFolder(tree);
    const moves = [];

    for (const id of ids) {
      const node = await getNode(id);
      if (!node) continue;
      moves.push({ id: node.id, parentId: node.parentId, index: node.index });
      await moveNode(node.id, { parentId: trashId });
    }

    return moves;
  }

  function traverse(node, path, bookmarks, folders) {
    if (!node) return;

    if (node.url) {
      bookmarks.push({
        id: node.id,
        title: node.title || '未命名书签',
        url: node.url,
        dateAdded: node.dateAdded || 0,
        parentId: node.parentId,
        index: node.index,
        path: path.slice()
      });
      return;
    }

    if (node.children) {
      const nextPath = node.title ? [...path, node.title] : path;
      if (node.title) {
        folders.push({
          id: node.id,
          title: node.title,
          parentId: node.parentId,
          childCount: node.children.length,
          path: path.slice()
        });
      }
      node.children.forEach(child => traverse(child, nextPath, bookmarks, folders));
    }
  }

  async function getAllData() {
    const tree = await getTree();
    const bookmarks = [];
    const folders = [];
    if (tree[0]) {
      traverse(tree[0], [], bookmarks, folders);
    }
    return { tree, bookmarks, folders };
  }

  async function getDefaultRootId(tree) {
    const root = tree?.[0];
    const children = root?.children || [];
    const preferIds = ['1', '2', '3'];
    const preferred = children.find(child => preferIds.includes(child.id));
    if (preferred) return preferred.id;
    const titleMatch = children.find(child => {
      const title = (child.title || '').toLowerCase();
      return title.includes('书签栏') || title.includes('bookmarks bar');
    });
    if (titleMatch) return titleMatch.id;
    return children[0]?.id || '1';
  }

  async function ensureTrashFolder(tree) {
    if (state.trashId) return state.trashId;
    const rootId = await getDefaultRootId(tree);
    const children = await getChildren(rootId);
    const existing = children.find(item => !item.url && item.title === TRASH_TITLE);
    const legacy = children.find(item => !item.url && item.title === LEGACY_TRASH_TITLE);
    if (existing) {
      state.trashId = existing.id;
      return existing.id;
    }
    if (legacy) {
      await new Promise((resolve, reject) => {
        chrome.bookmarks.update(legacy.id, { title: TRASH_TITLE }, (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(result);
          }
        });
      });
      state.trashId = legacy.id;
      return legacy.id;
    }
    const created = await new Promise((resolve, reject) => {
      chrome.bookmarks.create({ parentId: rootId, title: TRASH_TITLE }, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
    state.trashId = created.id;
    return created.id;
  }

  function normalizeExactUrl(url) {
    try {
      const parsed = new URL(url);
      parsed.hash = '';
      let normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
      if (parsed.search) normalized += parsed.search;
      if (normalized.endsWith('/') && parsed.pathname !== '/') {
        normalized = normalized.slice(0, -1);
      }
      return normalized.toLowerCase();
    } catch {
      return (url || '').toLowerCase().trim();
    }
  }

  function normalizeBaseUrl(url) {
    try {
      const parsed = new URL(url);
      parsed.hash = '';
      parsed.search = '';
      let host = parsed.host.toLowerCase();
      if (host.startsWith('www.')) host = host.slice(4);
      let path = parsed.pathname || '/';
      if (path.endsWith('/') && path !== '/') path = path.slice(0, -1);
      return `${host}${path}`;
    } catch {
      return (url || '').toLowerCase().trim();
    }
  }

  function getHostname(url) {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return '';
    }
  }

  function findNodeById(node, id) {
    if (!node) return null;
    if (node.id === id) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findNodeById(child, id);
        if (found) return found;
      }
    }
    return null;
  }

  function collectDescendantFolderTitles(node, rootId, set) {
    if (!node || node.url) return;
    if (node.title === TRASH_TITLE) return;
    if (node.id !== rootId && node.title) {
      set.add(node.title);
    }
    if (node.children) {
      node.children.forEach(child => collectDescendantFolderTitles(child, rootId, set));
    }
  }

  function getDescendantFolderTitles(tree, rootId) {
    const root = tree?.[0];
    const target = findNodeById(root, rootId);
    if (!target) return [];
    const set = new Set();
    collectDescendantFolderTitles(target, rootId, set);
    return Array.from(set);
  }

  function getBaseDomain(host) {
    if (!host) return '';
    // 二级域名后缀列表（.com.cn, .net.cn, .org.cn, .gov.cn, .co.uk, .co.jp 等）
    const secondLevelTLDs = [
      'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn', 'ac.cn',
      'co.uk', 'org.uk', 'me.uk', 'ltd.uk',
      'co.jp', 'ne.jp', 'or.jp', 'ac.jp',
      'com.au', 'net.au', 'org.au',
      'co.nz', 'net.nz', 'org.nz',
      'com.tw', 'org.tw', 'net.tw',
      'com.hk', 'org.hk', 'net.hk',
      'com.sg', 'org.sg', 'net.sg',
      'co.kr', 'or.kr', 'ne.kr'
    ];

    const parts = host.toLowerCase().split('.').filter(Boolean);
    if (parts.length <= 2) return host.toLowerCase();

    // 检查是否是二级域名后缀
    const lastTwo = parts.slice(-2).join('.');
    if (secondLevelTLDs.includes(lastTwo)) {
      // 如 data.10jqka.com.cn -> 10jqka.com.cn
      if (parts.length >= 3) {
        return parts.slice(-3).join('.');
      }
      return host.toLowerCase();
    }

    // 普通域名，取最后两部分
    // 如 www.example.com -> example.com
    return parts.slice(-2).join('.');
  }

  function cleanString(str) {
    return (str || '')
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '');
  }

  function diceCoefficient(a, b) {
    const s1 = cleanString(a);
    const s2 = cleanString(b);
    if (s1.length < 2 || s2.length < 2) return 0;
    const bigrams = new Map();
    for (let i = 0; i < s1.length - 1; i++) {
      const gram = s1.slice(i, i + 2);
      bigrams.set(gram, (bigrams.get(gram) || 0) + 1);
    }
    let matches = 0;
    for (let j = 0; j < s2.length - 1; j++) {
      const gram = s2.slice(j, j + 2);
      const count = bigrams.get(gram) || 0;
      if (count > 0) {
        bigrams.set(gram, count - 1);
        matches += 1;
      }
    }
    return (2 * matches) / ((s1.length - 1) + (s2.length - 1));
  }

  function similarityScore(bookmarkA, bookmarkB) {
    const titleScore = diceCoefficient(bookmarkA.title, bookmarkB.title);
    const pathScore = diceCoefficient(normalizeBaseUrl(bookmarkA.url), normalizeBaseUrl(bookmarkB.url));
    const hostScore = hostSimilarity(getHostname(bookmarkA.url), getHostname(bookmarkB.url));
    return { titleScore, pathScore, hostScore };
  }

  function hostSimilarity(hostA, hostB) {
    if (!hostA || !hostB) return 0;
    const baseA = getBaseDomain(hostA);
    const baseB = getBaseDomain(hostB);
    if (baseA && baseA === baseB) return 1.0;
    return diceCoefficient(hostA, hostB);
  }

  function buildUnionFind(size) {
    const parent = Array.from({ length: size }, (_, i) => i);
    const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    const union = (a, b) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[rb] = ra;
    };
    return { parent, find, union };
  }

  async function scanDuplicateBookmarks() {
    const includeExact = elements.dupExact.checked;
    const includeSimilar = elements.dupSimilar.checked;
    const threshold = Number(elements.similarityThreshold.value || 0.8);

    const { bookmarks } = await getAllData();
    const engine = typeof globalThis !== 'undefined' ? globalThis.SMDedupe : null;
    if (!engine || typeof engine.findDuplicates !== 'function') {
      console.warn('SMDedupe engine missing; falling back to exact-only grouping');
      const map = new Map();
      for (const bookmark of bookmarks) {
        const key = normalizeExactUrl(bookmark.url);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(bookmark);
      }
      const groups = [];
      for (const [key, items] of map.entries()) {
        if (items.length > 1) groups.push({ type: 'exact', key, items });
      }
      state.duplicateGroups = groups;
      renderDuplicateResults(groups, []);
      return;
    }

    const result = engine.findDuplicates(bookmarks, {
      includeExact,
      includeSimilar,
      threshold
    });
    state.duplicateGroups = result.groups || [];
    renderDuplicateResults(state.duplicateGroups, result.warnings || []);
  }

  function renderDuplicateResults(groups, warnings) {
    elements.dupResults.textContent = '';

    if (!groups.length) {
      const empty = document.createElement('div');
      empty.className = 'result-group';
      empty.textContent = t('no_duplicates');
      elements.dupResults.appendChild(empty);
      elements.dupSelectAll.disabled = true;
      elements.dupDelete.disabled = true;
      if (elements.dupDeleteDirect) elements.dupDeleteDirect.disabled = true;
      elements.dupSmartOldest.disabled = true;
      elements.dupSmartNewest.disabled = true;
      elements.dupSmartLongestUrl.disabled = true;
      if (elements.dupSmartApply) elements.dupSmartApply.disabled = true;
      return;
    }

    const frag = document.createDocumentFragment();

    if (warnings.length) {
      const warn = document.createElement('div');
      warn.className = 'result-group';
      const warnTitle = document.createElement('h3');
      warnTitle.textContent = t('tips');
      const warnMeta = document.createElement('div');
      warnMeta.className = 'meta';
      warnings.forEach((message, idx) => {
        if (idx > 0) warnMeta.appendChild(document.createElement('br'));
        warnMeta.appendChild(document.createTextNode(message));
      });
      warn.appendChild(warnTitle);
      warn.appendChild(warnMeta);
      frag.appendChild(warn);
    }

    groups.forEach((group, index) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'result-group';
      const typeLabel = group.type === 'exact' ? t('dup_type_exact') : t('dup_type_similar');
      const title = t('dup_group_title', { type: typeLabel, index: index + 1, count: group.items.length });
      const groupTitle = document.createElement('h3');
      groupTitle.textContent = title;
      groupEl.appendChild(groupTitle);

      const sorted = group.items.slice().sort((a, b) => b.dateAdded - a.dateAdded);
      sorted.forEach((item, idx) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'item dup-item' + (idx === 0 ? ' keep' : '');
        itemEl.dataset.id = item.id;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.id = item.id;
        checkbox.className = 'dup-checkbox';
        checkbox.checked = idx !== 0;

        const info = document.createElement('div');
        const titleRow = document.createElement('div');
        titleRow.className = 'title';
        titleRow.textContent = item.title || '';
        const recommend = document.createElement('span');
        recommend.className = 'meta recommend';
        recommend.dataset.id = item.id;
        recommend.textContent = idx === 0 ? t('recommended_keep') : '';
        titleRow.appendChild(document.createTextNode(' '));
        titleRow.appendChild(recommend);

        const urlRow = document.createElement('div');
        urlRow.className = 'url';
        const link = document.createElement('a');
        link.href = item.url || '';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = item.url || '';
        urlRow.appendChild(link);

        const pathRow = document.createElement('div');
        pathRow.className = 'meta';
        const pathText = (item.path && item.path.join(' / ')) || '根目录';
        pathRow.textContent = `${t('path')}：${pathText}`;

        info.appendChild(titleRow);
        info.appendChild(urlRow);
        info.appendChild(pathRow);
        const previewBtn = document.createElement('button');
        previewBtn.className = 'btn small preview-link';
        previewBtn.textContent = t('preview');
        previewBtn.dataset.url = item.url;
        info.appendChild(previewBtn);

        itemEl.appendChild(checkbox);
        itemEl.appendChild(info);
        groupEl.appendChild(itemEl);
      });

      frag.appendChild(groupEl);
    });

    elements.dupResults.appendChild(frag);
    elements.dupSelectAll.disabled = false;
    elements.dupDelete.disabled = false;
    if (elements.dupDeleteDirect) elements.dupDeleteDirect.disabled = false;
    elements.dupSmartOldest.disabled = false;
    elements.dupSmartNewest.disabled = false;
    elements.dupSmartLongestUrl.disabled = false;
    if (elements.dupSmartApply) elements.dupSmartApply.disabled = false;
  }

  async function deleteSelectedDuplicates() {
    const checkboxes = Array.from(document.querySelectorAll('.dup-checkbox'));
    const selected = checkboxes.filter(cb => cb.checked).map(cb => cb.dataset.id);
    if (!selected.length) return;

    const moves = await moveSelectedToTrash(selected, '删除重复书签');
    if (moves.length) {
      setUndo(t('undo_delete_duplicates'), moves);
    }
    await scanDuplicateBookmarks();
  }

  async function deleteSelectedDuplicatesDirect() {
    const checkboxes = Array.from(document.querySelectorAll('.dup-checkbox'));
    const selected = checkboxes.filter(cb => cb.checked).map(cb => cb.dataset.id);
    if (!selected.length) return;
    if (!confirm(t('confirm_delete_direct_bookmarks'))) return;

    for (const id of selected) {
      await new Promise((resolve, reject) => {
        chrome.bookmarks.remove(id, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    }

    clearUndo();
    await scanDuplicateBookmarks();
  }

  function computeDuplicateFolderGroups(folders, trashId) {
    const groupsMap = new Map();
    folders.forEach(folder => {
      if (!folder.title) return;
      if (folder.id === trashId) return;
      if (folder.path.includes(TRASH_TITLE)) return;
      if (!folder.parentId) return;
      const key = `${folder.parentId}::${folder.title.toLowerCase()}`;
      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key).push(folder);
    });

    const groups = [];
    groupsMap.forEach((items, key) => {
      if (items.length > 1) {
        groups.push({ key, items });
      }
    });

    return groups;
  }

  async function scanDuplicateFolders() {
    const { tree, folders } = await getAllData();
    const trashId = await ensureTrashFolder(tree);
    const groups = computeDuplicateFolderGroups(folders, trashId);
    state.duplicateFolderGroups = groups;
    renderDuplicateFolderResults(groups);
  }

  function renderDuplicateFolderResults(groups) {
    elements.dupFolderResults.textContent = '';

    if (!groups.length) {
      const empty = document.createElement('div');
      empty.className = 'result-group';
      empty.textContent = t('no_dup_folders');
      elements.dupFolderResults.appendChild(empty);
      elements.dupFolderSelectAll.disabled = true;
      elements.dupFolderDelete.disabled = true;
      if (elements.dupFolderDeleteDirect) elements.dupFolderDeleteDirect.disabled = true;
      return;
    }

    const frag = document.createDocumentFragment();

    groups.forEach((group, index) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'result-group';
      const groupTitle = document.createElement('h3');
      groupTitle.textContent = t('dup_folder_group_title', { index: index + 1, count: group.items.length });
      groupEl.appendChild(groupTitle);

      const sorted = group.items.slice();
      sorted.forEach((item, idx) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'item' + (idx === 0 ? ' keep' : '');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.id = item.id;
        checkbox.className = 'dup-folder-checkbox';
        if (idx === 0) {
          checkbox.disabled = true;
        } else {
          checkbox.checked = true;
        }

        const info = document.createElement('div');
        const titleRow = document.createElement('div');
        titleRow.className = 'title';
        titleRow.textContent = item.title || '';
        if (idx === 0) {
          const keepSpan = document.createElement('span');
          keepSpan.className = 'meta';
          keepSpan.textContent = '(保留)';
          titleRow.appendChild(document.createTextNode(' '));
          titleRow.appendChild(keepSpan);
        }

        const pathRow = document.createElement('div');
        pathRow.className = 'meta';
        const pathText = (item.path && item.path.join(' / ')) || '根目录';
        pathRow.textContent = `${t('path')}：${pathText}`;

        info.appendChild(titleRow);
        info.appendChild(pathRow);

        itemEl.appendChild(checkbox);
        itemEl.appendChild(info);
        groupEl.appendChild(itemEl);
      });

      frag.appendChild(groupEl);
    });

    elements.dupFolderResults.appendChild(frag);
    elements.dupFolderSelectAll.disabled = false;
    elements.dupFolderDelete.disabled = false;
    if (elements.dupFolderDeleteDirect) elements.dupFolderDeleteDirect.disabled = false;
  }

  async function deleteSelectedDuplicateFolders() {
    const checkboxes = Array.from(document.querySelectorAll('.dup-folder-checkbox'));
    const selected = checkboxes.filter(cb => cb.checked).map(cb => cb.dataset.id);
    if (!selected.length) return;

    const moves = await moveSelectedToTrash(selected, '删除重复文件夹');
    if (moves.length) {
      setUndo(t('undo_delete_dup_folders'), moves);
    }
    await scanDuplicateFolders();
  }

  async function deleteSelectedDuplicateFoldersDirect() {
    const checkboxes = Array.from(document.querySelectorAll('.dup-folder-checkbox'));
    const selected = checkboxes.filter(cb => cb.checked).map(cb => cb.dataset.id);
    if (!selected.length) return;
    if (!confirm(t('confirm_delete_direct_folders'))) return;

    for (const id of selected) {
      await removeTree(id);
    }

    clearUndo();
    await scanDuplicateFolders();
  }

  async function scanEmptyFolders() {
    const { tree, folders } = await getAllData();
    const trashId = await ensureTrashFolder(tree);

    const duplicateGroups = computeDuplicateFolderGroups(folders, trashId);
    state.duplicateFolderGroups = duplicateGroups;
    renderDuplicateFolderResults(duplicateGroups);

    const duplicateIds = new Set();
    duplicateGroups.forEach(group => {
      group.items.forEach(item => duplicateIds.add(item.id));
    });

    // Build a map of folder ID to folder data for quick lookup
    const folderMap = new Map();
    folders.forEach(f => folderMap.set(f.id, f));

    // Build parent-children relationship from tree
    const root = tree?.[0];
    const childrenMap = new Map(); // parentId -> [childNodes]

    function buildChildrenMap(node) {
      if (!node) return;
      if (node.children) {
        childrenMap.set(node.id, node.children);
        node.children.forEach(child => buildChildrenMap(child));
      } else {
        childrenMap.set(node.id, []);
      }
    }
    buildChildrenMap(root);

    // Recursively check if a folder is "empty" (contains no bookmarks, only empty subfolders)
    const emptyCache = new Map(); // id -> boolean

    function isRecursivelyEmpty(folderId) {
      if (emptyCache.has(folderId)) return emptyCache.get(folderId);

      const children = childrenMap.get(folderId) || [];

      // If no children at all, it's empty
      if (children.length === 0) {
        emptyCache.set(folderId, true);
        return true;
      }

      // Check each child
      for (const child of children) {
        if (child.url) {
          // This is a bookmark, so folder is not empty
          emptyCache.set(folderId, false);
          return false;
        } else {
          // This is a subfolder, recursively check
          if (!isRecursivelyEmpty(child.id)) {
            emptyCache.set(folderId, false);
            return false;
          }
        }
      }

      // All children are recursively empty subfolders
      emptyCache.set(folderId, true);
      return true;
    }

    // Find all recursively empty folders
    const emptyFolders = folders.filter(folder =>
      folder.id !== trashId &&
      !folder.path.includes(TRASH_TITLE) &&
      !duplicateIds.has(folder.id) &&
      isRecursivelyEmpty(folder.id)
    );

    // Sort by depth (deepest first) so we delete leaf folders first
    emptyFolders.sort((a, b) => b.path.length - a.path.length);

    state.emptyFolders = emptyFolders;
    renderEmptyFolderResults(emptyFolders);
  }

  function renderEmptyFolderResults(folders) {
    elements.emptyFolderResults.textContent = '';

    if (!folders.length) {
      const empty = document.createElement('div');
      empty.className = 'result-group';
      empty.textContent = t('no_empty_folders');
      elements.emptyFolderResults.appendChild(empty);
      elements.emptyFolderSelectAll.disabled = true;
      elements.emptyFolderDelete.disabled = true;
      if (elements.emptyFolderDeleteDirect) elements.emptyFolderDeleteDirect.disabled = true;
      return;
    }

    const groupEl = document.createElement('div');
    groupEl.className = 'result-group';
    const groupTitle = document.createElement('h3');
    groupTitle.textContent = t('empty_group_title', { count: folders.length });
    groupEl.appendChild(groupTitle);

    folders.forEach(folder => {
      const itemEl = document.createElement('div');
      itemEl.className = 'item';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.id = folder.id;
      checkbox.className = 'empty-folder-checkbox';
      checkbox.checked = true;

      const info = document.createElement('div');
      const titleRow = document.createElement('div');
      titleRow.className = 'title';
      titleRow.textContent = folder.title || '';

      const pathRow = document.createElement('div');
      pathRow.className = 'meta';
      const pathText = (folder.path && folder.path.join(' / ')) || '根目录';
      pathRow.textContent = `${t('path')}：${pathText}`;

      info.appendChild(titleRow);
      info.appendChild(pathRow);

      itemEl.appendChild(checkbox);
      itemEl.appendChild(info);
      groupEl.appendChild(itemEl);
    });

    elements.emptyFolderResults.appendChild(groupEl);
    elements.emptyFolderSelectAll.disabled = false;
    elements.emptyFolderDelete.disabled = false;
    if (elements.emptyFolderDeleteDirect) elements.emptyFolderDeleteDirect.disabled = false;
  }

  async function deleteSelectedEmptyFolders() {
    const checkboxes = Array.from(document.querySelectorAll('.empty-folder-checkbox'));
    const selected = checkboxes.filter(cb => cb.checked).map(cb => cb.dataset.id);
    if (!selected.length) return;

    const moves = await moveSelectedToTrash(selected, '删除空文件夹');
    if (moves.length) {
      setUndo(t('undo_delete_empty_folders'), moves);
    }

    // Rescan to find newly emptied parent folders
    await scanEmptyFolders();
  }

  async function deleteSelectedEmptyFoldersDirect() {
    const checkboxes = Array.from(document.querySelectorAll('.empty-folder-checkbox'));
    const selected = checkboxes.filter(cb => cb.checked).map(cb => cb.dataset.id);
    if (!selected.length) return;
    if (!confirm(t('confirm_delete_direct_empty'))) return;

    let totalDeleted = 0;
    let hasMore = true;

    // Delete in loop until no more empty folders
    while (hasMore) {
      const currentSelected = hasMore && totalDeleted === 0
        ? selected
        : Array.from(document.querySelectorAll('.empty-folder-checkbox:checked')).map(cb => cb.dataset.id);

      if (!currentSelected.length) {
        hasMore = false;
        break;
      }

      for (const id of currentSelected) {
        try {
          await removeTree(id);
          totalDeleted++;
        } catch (e) {
          console.warn('Failed to delete folder:', id, e);
        }
      }

      // Rescan to find parent folders that are now empty
      const { tree, folders } = await getAllData();
      const trashId = await ensureTrashFolder(tree);
      const duplicateGroups = computeDuplicateFolderGroups(folders, trashId);
      const duplicateIds = new Set();
      duplicateGroups.forEach(group => {
        group.items.forEach(item => duplicateIds.add(item.id));
      });

      const newEmptyFolders = folders.filter(folder =>
        folder.childCount === 0 &&
        folder.id !== trashId &&
        !folder.path.includes(TRASH_TITLE) &&
        !duplicateIds.has(folder.id)
      );

      if (newEmptyFolders.length === 0) {
        hasMore = false;
      } else {
        // Update state and render for next iteration
        state.emptyFolders = newEmptyFolders;
        renderEmptyFolderResults(newEmptyFolders);
        // Auto-check all for next delete round
        Array.from(document.querySelectorAll('.empty-folder-checkbox')).forEach(cb => cb.checked = true);
      }
    }

    clearUndo();
    await scanEmptyFolders();

    if (totalDeleted > 0) {
      alert(`已删除 ${totalDeleted} 个空文件夹。`);
    }
  }

  function classifyBookmark(bookmark) {
    const rawUrl = bookmark.url || '';
    const url = rawUrl.toLowerCase();
    const title = (bookmark.title || '').toLowerCase();
    const rawHost = getHostname(rawUrl).toLowerCase();
    const host = rawHost.startsWith('www.') ? rawHost.slice(4) : rawHost;
    let path = '';
    let query = '';
    try {
      const parsed = new URL(rawUrl);
      path = parsed.pathname.toLowerCase();
      query = parsed.search.toLowerCase();
    } catch {
      path = '';
      query = '';
    }

    const extMatch = path.match(/\.([a-z0-9]{1,8})$/);
    const ext = extMatch ? extMatch[1] : '';

    // 1. 文件类型优先
    const extRules = [
      {
        type: '\u{1F4BB} 开发资源', // Code
        exts: ['js', 'mjs', 'cjs', 'ts', 'jsx', 'tsx', 'vue', 'svelte', 'py', 'ipynb', 'java', 'c', 'cpp', 'h', 'hpp', 'go', 'rs', 'php', 'rb', 'swift', 'kt', 'cs', 'html', 'css', 'scss', 'less', 'json', 'yaml', 'yml', 'toml', 'xml', 'sh', 'bat', 'ps1', 'sql', 'lua']
      },
      { type: '\u{1F4D6} 阅读/文档', exts: ['pdf', 'epub', 'mobi', 'azw', 'azw3', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'md', 'txt', 'rtf'] },
      { type: '\u{1F5BC} 图片素材', exts: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico', 'heic', 'psd', 'ai', 'eps'] },
      { type: '\u{1F3B5} 影音/娱乐', exts: ['mp3', 'flac', 'wav', 'mp4', 'mkv', 'avi', 'mov', 'webm'] },
      { type: '\u2B07\uFE0F 软件下载', exts: ['zip', 'rar', '7z', 'tar', 'gz', 'dmg', 'exe', 'msi', 'apk', 'ipa', 'iso'] }
    ];

    if (ext) {
      for (const rule of extRules) {
        if (rule.exts.includes(ext)) return rule.type;
      }
    }

    const titleText = title;
    const urlText = `${host} ${url} ${path} ${query}`;

    // 辅助匹配函数
    const matchHost = (rule) => {
      const hosts = rule.hosts || [];
      if (!hosts.length) return false;
      if (rule.exactHost) return hosts.includes(rawHost) || hosts.includes(host);
      return hosts.some(h => host === h || host.endsWith(`.${h}`));
    };

    const countMatches = (list, text) => {
      if (!list || !list.length || !text) return 0;
      let count = 0;
      list.forEach(keyword => {
        if (text.includes(keyword)) count++;
      });
      return Math.min(count, 5); // 封顶权重
    };

    // 2. 主流分类规则 (包含国内外)
    const rules = [
      {
        type: '\u{1F916} AI/人工智能',
        hosts: [
          'openai.com', 'chatgpt.com', 'claude.ai', 'anthropic.com', 'huggingface.co', 'midjourney.com', 'stability.ai',
          'perplexity.ai', 'poe.com', 'coze.com', 'coze.cn',
          'kimi.moonshot.cn', 'moonshot.cn', 'tongyi.aliyun.com', 'qwen.ai', 'yiyan.baidu.com', 'wenxin.baidu.com',
          'chat.deepseek.com', 'deepseek.com', 'doubao.com', 'zhipuai.cn', 'chatglm.cn', 'minimax.chat', '01.ai',
          'metaso.cn', 'tiangong.cn', 'xinghuo.xfyun.cn'
        ],
        keywords: ['ai', 'gpt', 'llm', 'aigc', 'prompt', 'model', 'diffusion', 'copilot', 'agent', 'chatbot', '人工智能', '大模型', '生成式', '文生图', '智能助手'],
        titleKeywords: ['ai', 'gpt', '大模型', '人工智能', '助手', 'copilot']
      },
      {
        type: '\u{1F4BB} 开发资源',
        hosts: [
          'github.com', 'gitlab.com', 'gitee.com', 'bitbucket.org', 'stackoverflow.com', 'v2ex.com', 'juejin.cn', 'csdn.net',
          'cnblogs.com', 'oschina.net', 'segmentfault.com', 'npmjs.com', 'pypi.org', 'docker.com', 'kubernetes.io',
          'developer.mozilla.org', 'w3schools.com', 'runoob.com', 'infoq.cn', '51cto.com', 'vercel.com', 'netlify.com',
          'aliyun.com', 'tencent.com', 'huaweicloud.com', 'aws.amazon.com', 'azure.microsoft.com'
        ],
        keywords: [
          'github', 'git', 'coding', 'programming', 'developer', 'api', 'sdk', 'docs', 'stack overflow',
          '源码', '开源', '开发', '编程', '算法', '前端', '后端', '全栈', '框架', '文档', '教程'
        ],
        titleKeywords: ['github', '源码', '教程', 'api', '文档', '开发']
      },
      {
        type: '\u{1F50E} 搜索引擎',
        hosts: [
          'google.com', 'bing.com', 'baidu.com', 'sogou.com', 'so.com', 'duckduckgo.com', 'yandex.com', 'magi.com', 'fsearch.cc'
        ],
        keywords: ['search', '搜索', '查询'],
        titleKeywords: ['搜索', '查询']
      },
      {
        type: '\u{1F3A5} 视频/直播',
        hosts: [
          'youtube.com', 'bilibili.com', 'b23.tv', 'tiktok.com', 'douyin.com', 'kuaishou.com', 'twitch.tv', 'douyu.com', 'huya.com',
          'netflix.com', 'iqiyi.com', 'youku.com', 'v.qq.com', 'mgtv.com', 'hulu.com', 'disneyplus.com', 'acfun.cn'
        ],
        keywords: ['video', 'movie', 'live', 'stream', '视频', '电影', '直播', '影视', '剧集', '番剧', '短视频'],
        titleKeywords: ['视频', '直播', '电影', '电视剧']
      },
      {
        type: '\u{1F3B5} 音乐/音频',
        hosts: [
          'spotify.com', 'music.apple.com', 'soundcloud.com', 'music.163.com', 'y.qq.com', 'kugou.com', 'kuwo.cn',
          'ximalaya.com', 'lizhi.fm', 'xiaoyuzhoufm.com'
        ],
        keywords: ['music', 'audio', 'podcast', 'song', 'playlist', '音乐', '音频', '播客', '电台', '歌曲', '歌单'],
        titleKeywords: ['音乐', '播客', '电台']
      },
      {
        type: '\u{1F5BC} 设计/素材',
        hosts: [
          'dribbble.com', 'behance.net', 'pinterest.com', 'artstation.com', 'huaban.com', 'zcool.com.cn', 'figma.com', 'canva.com',
          'unsplash.com', 'pexels.com', 'pixabay.com', 'iconfont.cn', 'iconpark.bytedance.com', 'freepik.com'
        ],
        keywords: ['design', 'art', 'ui', 'ux', 'icon', 'logo', 'vector', 'illustration', 'wallpaper', '设计', '素材', '图标', '插画', '壁纸', '摄影', '美工'],
        titleKeywords: ['设计', '素材', '图标', '壁纸']
      },
      {
        type: '\u{1F4F0} 新闻/资讯',
        hosts: [
          'twitter.com', 'x.com', 'weibo.com', 'toutiao.com', 'thepaper.cn', '36kr.com', 'sspai.com', 'ifanr.com',
          'news.qq.com', 'sina.com.cn', '163.com', 'sohu.com', 'ifeng.com', 'huxiu.com', 'nytimes.com', 'bbc.com', 'cnn.com',
          'wsj.com', 'reuters.com', 'bloomberg.com', 'wallstreetcn.com', 'caixin.com'
        ],
        keywords: ['news', 'finance', 'tech', 'daily', 'report', '新闻', '资讯', '头条', '日报', '报道', '财经', '科技'],
        titleKeywords: ['新闻', '资讯', '日报', '报道']
      },
      {
        type: '\u{1F4AC} 社交/社区',
        hosts: [
          'facebook.com', 'instagram.com', 'linkedin.com', 'reddit.com', 'discord.com', 'telegram.org', 'whatsapp.com',
          'zhihu.com', 'douban.com', 'xiaohongshu.com', 'tieba.baidu.com', 'nga.cn', 'hupu.com', 'wechat.com', 'qq.com'
        ],
        keywords: ['social', 'community', 'forum', 'bbs', 'chat', 'discuss', '社交', '社区', '论坛', '讨论', '贴吧', '问答', '动态'],
        titleKeywords: ['社区', '论坛', '贴吧', '讨论']
      },
      {
        type: '\u{1F393} 教育/学习',
        hosts: [
          'coursera.org', 'edx.org', 'udemy.com', 'khanacademy.org', 'duolingo.com',
          'icourse163.org', 'mooc.org', 'xuetangx.com', 'zhihuishu.com', 'chaoxing.com', 'cnki.net', 'wanfangdata.com.cn'
        ],
        keywords: ['edu', 'course', 'learn', 'study', 'university', 'research', 'paper', '教育', '课程', '学习', '大学', '论文', '学术', '考试'],
        titleKeywords: ['课程', '教程', '学习', '教育']
      },
      {
        type: '\u{1F6D2} 购物/消费',
        hosts: [
          'amazon.com', 'ebay.com', 'taobao.com', 'tmall.com', 'jd.com', 'pinduoduo.com', 'vip.com', 'suning.com',
          'smzdm.com', 'meituan.com', 'ele.me', 'dianping.com', '12306.cn', 'trip.com', 'ctrip.com', 'qunar.com', 'feizhu.com'
        ],
        keywords: ['shop', 'store', 'buy', 'price', 'deal', 'mall', 'travel', 'hotel', 'ticket', '购物', '商城', '买', '价格', '优惠', '团购', '外卖', '旅行', '酒店', '机票'],
        titleKeywords: ['购物', '商城', '优惠', '酒店', '旅行']
      },
      {
        type: '\u{1F4C2} 办公/工具',
        hosts: [
          'google.com/docs', 'docs.google.com', 'notion.so', 'wolai.com', 'flowus.cn', 'feishu.cn', 'dingtalk.com', 'wps.cn',
          'office.com', 'microsoft365.com', 'zoom.us', 'meeting.tencent.com', 'shimo.im', 'yuque.com', 'mail.qq.com', 'outlook.com', 'gmail.com', '163.com/mail',
          'translate.google.com', 'fanyi.baidu.com', 'deepl.com', 'pan.baidu.com', 'aliyundrive.com', 'quark.cn', 'lanzou.com',
          'speedtest.net', 'ip138.com', 'tool.lu', 'convertio.co'
        ],
        keywords: ['tool', 'office', 'docs', 'sheet', 'slide', 'mail', 'drive', 'cloud', 'calendar', 'meeting', '工具', '办公', '文档', '表格', '邮箱', '云盘', '网盘', '会议', '转换', '翻译', '测试'],
        titleKeywords: ['工具', '办公', '文档', '网盘', '邮箱']
      }
    ];

    let bestType = '';
    let bestScore = 0;

    // 优先匹配主机名
    for (const rule of rules) {
      if (matchHost(rule)) {
        // 主机名匹配权重很高，直接作为候选，但继续检查关键词以防误判（虽然通常域名决定了类型）
        // 这里给一个基础高分
        const score = 100;
        if (score > bestScore) {
          bestScore = score;
          bestType = rule.type;
        }
      }
    }

    // 如果没有主机名匹配，或者想通过关键词加强
    rules.forEach(rule => {
      let score = 0;
      if (bestType === rule.type) score += 100; // 继承主机名匹配的分数

      const titleCount = countMatches(rule.titleKeywords || rule.keywords || [], titleText);
      const urlCount = countMatches(rule.keywords || [], urlText);
      const pathCount = countMatches(rule.keywords || [], path); // 对路径也应用关键词

      score += titleCount * 10;
      score += urlCount * 5;
      score += pathCount * 2;

      if (score > bestScore && score > 15) { // 设定最小匹配阈值，避免强行归类
        bestScore = score;
        bestType = rule.type;
      }
    });

    return bestScore > 0 ? bestType : ARCHIVE_OTHER_LABEL;
  }

  function parseArchiveKeywords(text) {
    return (text || '')
      .toLowerCase()
      .split(/[\s,，]+/)
      .map(part => part.trim())
      .filter(Boolean);
  }

  // ===== AI 配置管理 =====
  function getAiConfig() {
    const settings = loadSettings();
    const ai = settings.ai || {};
    return {
      baseUrl: (elements.aiBaseUrl?.value || ai.baseUrl || '').trim(),
      apiKey: (elements.aiApiKey?.value || ai.apiKey || '').trim(),
      model: (elements.aiModel?.value || ai.model || '').trim(),
      batchSize: ai.batchSize || 25,
      concurrency: ai.concurrency || 2
    };
  }

  function aiAvailable() {
    const ai = typeof globalThis !== 'undefined' ? globalThis.SMAI : null;
    const analyzer = typeof globalThis !== 'undefined' ? globalThis.SMAIAnalyzer : null;
    return !!(ai && analyzer && ai.chat && analyzer.analyzeBookmarks);
  }

  function setAiStatus(message, tone) {
    setTransferStatus(elements.aiStatus, message, tone || '');
  }

  function applyAiConfigToUi() {
    const settings = loadSettings();
    const ai = settings.ai || {};
    if (elements.aiBaseUrl) elements.aiBaseUrl.value = ai.baseUrl || '';
    if (elements.aiApiKey) elements.aiApiKey.value = ai.apiKey || '';
    if (elements.aiModel && ai.model) {
      const has = Array.from(elements.aiModel.options).some(o => o.value === ai.model);
      if (!has) {
        const opt = document.createElement('option');
        opt.value = ai.model;
        opt.textContent = ai.model;
        elements.aiModel.appendChild(opt);
      }
      elements.aiModel.value = ai.model;
    }
  }

  function saveAiConfig() {
    const settings = loadSettings();
    settings.ai = {
      ...(settings.ai || {}),
      baseUrl: (elements.aiBaseUrl?.value || '').trim(),
      apiKey: (elements.aiApiKey?.value || '').trim(),
      model: (elements.aiModel?.value || '').trim()
    };
    saveSettings(settings);
    setAiStatus('AI 配置已保存（仅存于本机浏览器）', 'success');
  }

  function clearAiConfig() {
    const settings = loadSettings();
    settings.ai = { ...DEFAULT_SETTINGS.ai };
    saveSettings(settings);
    applyAiConfigToUi();
    setAiStatus('AI 配置已清除', 'info');
  }

  async function refreshAiModels() {
    const ai = typeof globalThis !== 'undefined' ? globalThis.SMAI : null;
    if (!ai || !ai.listModels) {
      setAiStatus('AI 模块不可用', 'error');
      return;
    }
    const config = getAiConfig();
    if (!config.baseUrl) {
      setAiStatus('请先填写接口地址', 'error');
      return;
    }
    setAiStatus('正在拉取模型列表…', 'info');
    try {
      const models = await ai.listModels(config, { timeoutMs: 20000 });
      if (elements.aiModel) {
        const current = elements.aiModel.value;
        elements.aiModel.textContent = '';
        models.forEach(name => {
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          elements.aiModel.appendChild(opt);
        });
        if (current && models.includes(current)) {
          elements.aiModel.value = current;
        } else {
          const preferred = models.find(m => /workbuddy\/deepseek-v4\.1-flash/.test(m))
            || models.find(m => /deepseek/i.test(m))
            || models[0];
          if (preferred) elements.aiModel.value = preferred;
        }
      }
      setAiStatus(`已获取 ${models.length} 个模型`, 'success');
    } catch (error) {
      setAiStatus(`拉取失败：${error.message || error}`, 'error');
    }
  }

  async function testAiConnection() {
    const ai = typeof globalThis !== 'undefined' ? globalThis.SMAI : null;
    if (!ai || !ai.testConnection) {
      setAiStatus('AI 模块不可用', 'error');
      return;
    }
    const config = getAiConfig();
    if (!config.baseUrl || !config.model) {
      setAiStatus('请先填写接口地址并选择模型', 'error');
      return;
    }
    setAiStatus('正在测试连接…', 'info');
    const result = await ai.testConnection(config, { timeoutMs: 30000 });
    if (result.ok) {
      setAiStatus(`连接成功 · ${result.modelCount} 个模型 · ${result.latencyMs}ms`, 'success');
    } else {
      setAiStatus(`连接失败：${result.error}`, 'error');
    }
  }

  // ===== 归档引擎桥接 =====
  function archiveEngine() {
    return typeof globalThis !== 'undefined' ? globalThis.SMArchive : null;
  }

  function archiveCategoryLabel(categoryId) {
    const engine = archiveEngine();
    const naming = state.archiveNaming || 'zh';
    if (engine && Array.isArray(engine.CATEGORIES)) {
      const found = engine.CATEGORIES.find(c => c.id === categoryId);
      if (found) {
        const en = found.label || categoryId;
        const zh = found.labelZh || found.label || categoryId;
        let name = zh;
        if (naming === 'en') name = en;
        else if (naming === 'both') name = `${zh}（${en}）`;
        return `${found.icon || ''} ${name}`.trim();
      }
    }
    return categoryId || ARCHIVE_OTHER_LABEL;
  }

  /** Classify locally with SMArchive, falling back to the legacy classifier. */
  function classifyBookmarkLocal(bookmark) {
    const engine = archiveEngine();
    if (engine && typeof engine.classify === 'function') {
      try {
        const result = engine.classify(bookmark);
        return archiveCategoryLabel(result.category);
      } catch {
        /* fall through */
      }
    }
    return classifyBookmark(bookmark);
  }

  /** Run the AI analyzer when configured; returns a Map(bookmarkId -> label). */
  async function analyzeWithAi(bookmarks) {
    if (!aiAvailable()) return null;
    const config = getAiConfig();
    if (!config.baseUrl || !config.model) return null;
    const analyzer = globalThis.SMAIAnalyzer;
    setAiStatus(`AI 分析中：共 ${bookmarks.length} 条…`, 'info');
    const analysis = await analyzer.analyzeBookmarks(bookmarks, config, {
      batchSize: config.batchSize,
      concurrency: config.concurrency,
      onProgress: (done, total) => {
        setAiStatus(`AI 分析进度 ${done}/${total}`, 'info');
      }
    });
    const map = new Map();
    for (const item of analysis.results || []) {
      map.set(item.id, archiveCategoryLabel(item.category));
    }
    const aiCount = (analysis.stats && analysis.stats.analyzed - analysis.stats.fallback) || 0;
    setAiStatus(`AI 分析完成：${aiCount} 条由模型判定，${analysis.stats.fallback || 0} 条本地兜底`, 'success');
    return map;
  }

  function mapToLegacyGroups(classMap, bookmarks) {
    const groups = new Map();
    for (const bookmark of bookmarks) {
      const key = classMap.get(bookmark.id) || ARCHIVE_OTHER_LABEL;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(bookmark);
    }
    return Array.from(groups.entries())
      .map(([name, items]) => ({ name, items }))
      .sort((a, b) => b.items.length - a.items.length);
  }

  function matchesArchiveKeywords(item, terms) {
    if (!terms.length) return true;
    const haystack = `${item.title || ''} ${item.url || ''}`.toLowerCase();
    return terms.some(term => haystack.includes(term));
  }

  function computeArchiveGroups(bookmarks, mode, groupKeys, preferredGroups = []) {
    const groups = new Map();
    const preferredSet = new Set(preferredGroups);
    const usePreferred = preferredSet.size > 0;
    const effectiveGroupKeys = (mode === 'custom' && usePreferred) ? preferredGroups : groupKeys;

    const findCustomKey = (bookmark, keys) => {
      const domain = getHostname(bookmark.url) || '';
      const type = classifyBookmark(bookmark);
      const candidate = (keys || []).find(name => name && (name === domain || name === type || domain.includes(name)));
      return candidate || ARCHIVE_OTHER_LABEL;
    };

    // Pre-compute classification cache for type mode to avoid redundant calculations
    const classificationCache = mode === 'type' ? new Map() : null;

    bookmarks.forEach(bookmark => {
      let key = '';
      if (mode === 'type') {
        // Use cache to avoid re-classifying the same URL patterns
        const cacheKey = getHostname(bookmark.url) || bookmark.url;
        if (classificationCache.has(cacheKey)) {
          key = classificationCache.get(cacheKey);
        } else {
          key = classifyBookmark(bookmark);
          classificationCache.set(cacheKey, key);
        }
        if (usePreferred && !preferredSet.has(key)) {
          key = ARCHIVE_OTHER_LABEL;
        }
      } else if (mode === 'domain') {
        // Use base domain (e.g. example.com instead of sub.example.com) for better grouping
        const host = getHostname(bookmark.url);
        key = getBaseDomain(host) || host || '未知域名';
        if (usePreferred && !preferredSet.has(key)) {
          key = ARCHIVE_OTHER_LABEL;
        }
      } else {
        key = findCustomKey(bookmark, effectiveGroupKeys);
      }

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(bookmark);
    });

    const result = Array.from(groups.entries()).map(([name, items]) => ({ name, items }));
    result.sort((a, b) => b.items.length - a.items.length);
    return result;
  }

  function rebuildArchiveGroupsFromSelection() {
    if (!state.archiveBookmarks.length) {
      renderArchiveResults([]);
      return;
    }
    const preferred = state.archiveGroupSelections;
    const groups = preferred.length
      ? computeArchiveGroups(state.archiveBookmarks, state.archiveMode, state.archiveGroupKeys, preferred)
      : computeArchiveGroups(state.archiveBookmarks, state.archiveMode, state.archiveGroupKeys, []);
    state.archiveGroups = groups;
    renderArchiveResults(groups);
  }

  function updateArchiveBulkTargetOptions() {
    if (!elements.archiveBulkTarget) return;
    const current = elements.archiveBulkTarget.value;
    const optionSet = new Set([...state.archiveFolderOptions, ...state.archiveGroups.map(g => g.name)]);
    const options = Array.from(optionSet).filter(Boolean);
    elements.archiveBulkTarget.textContent = '';
    options.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      elements.archiveBulkTarget.appendChild(opt);
    });
    if (current && options.includes(current)) {
      elements.archiveBulkTarget.value = current;
    } else if (options.length) {
      elements.archiveBulkTarget.value = options[0];
    }
  }


  async function buildFolderSelect() {
    const { tree, folders } = await getAllData();
    const root = tree[0];
    const options = [];

    const rootChildren = root?.children || [];
    rootChildren.forEach(child => {
      if (!child.url) {
        options.push({ id: child.id, label: child.title || '未命名根目录' });
      }
    });

    folders.forEach(folder => {
      options.push({
        id: folder.id,
        label: `${folder.path.join(' / ')} / ${folder.title}`
      });
    });

    const applyOptions = (selectEl) => {
      if (!selectEl) return;
      const current = selectEl.value;
      selectEl.textContent = '';
      options.forEach(opt => {
        const optionEl = document.createElement('option');
        optionEl.value = opt.id;
        optionEl.textContent = opt.label;
        selectEl.appendChild(optionEl);
      });
      if (current && options.some(opt => opt.id === current)) {
        selectEl.value = current;
      } else if (options[0]) {
        selectEl.value = options[0].id;
      }
    };

    applyOptions(elements.archiveRoot);
    applyOptions(elements.importTarget);
  }

  async function createArchiveRoot() {
    const name = (elements.archiveNewRoot?.value || '').trim();
    if (!name) return;
    const { tree } = await getAllData();
    const rootId = await getDefaultRootId(tree);
    await new Promise((resolve, reject) => {
      chrome.bookmarks.create({ parentId: rootId, title: name }, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
    elements.archiveNewRoot.value = '';
    await buildFolderSelect();
    const options = Array.from(elements.archiveRoot.options);
    const match = options.find(opt => opt.textContent === name);
    if (match) {
      elements.archiveRoot.value = match.value;
    }
  }

  async function buildArchivePreview() {
    const mode = document.querySelector('input[name="archive-mode"]:checked')?.value || 'domain';
    const rootId = elements.archiveRoot.value;
    if (!rootId) return;

    const { tree, bookmarks } = await getAllData();
    const trashId = await ensureTrashFolder(tree);

    state.archiveFolderOptions = getDescendantFolderTitles(tree, rootId);
    state.archiveMode = mode;

    let groupKeys = null;
    if (mode === 'custom') {
      groupKeys = getDescendantFolderTitles(tree, rootId);
      if (!groupKeys.length) {
        groupKeys = [ARCHIVE_OTHER_LABEL];
      }
    }
    state.archiveGroupKeys = groupKeys || [];
    state.archiveNaming = elements.archiveNaming?.value || loadSettings().archive?.naming || 'zh';

    const validBookmarks = bookmarks.filter(bookmark =>
      bookmark.url &&
      bookmark.parentId !== trashId &&
      !bookmark.path.includes(TRASH_TITLE)
    );

    state.archiveBookmarks = validBookmarks;

    // AI mode: classify every bookmark with the model (local fallback on failure).
    if (mode === 'ai') {
      const minGroup = Math.max(1, Number(elements.archiveMinGroup?.value || 2));
      let classMap = null;
      try {
        classMap = await analyzeWithAi(validBookmarks);
      } catch (error) {
        setAiStatus(`AI 分析失败，已回退本地分类：${error.message || error}`, 'error');
      }
      if (!classMap) {
        classMap = new Map();
        for (const bookmark of validBookmarks) {
          classMap.set(bookmark.id, classifyBookmarkLocal(bookmark));
        }
      }
      const aiGroups = mapToLegacyGroups(classMap, validBookmarks)
        .filter(group => group.items.length >= minGroup);
      state.archiveGroups = aiGroups;
      state.archiveFilterOptions = aiGroups.map(g => g.name).filter(Boolean);
      updateArchiveBulkTargetOptions();
      updateArchiveFilterOptions();
      renderArchiveResults(aiGroups);
      return;
    }

    // Date mode: bucket by the year the bookmark was added.
    if (mode === 'date') {
      const minGroup = Math.max(1, Number(elements.archiveMinGroup?.value || 2));
      const currentYear = new Date().getFullYear();
      const dateGroups = new Map();
      for (const bookmark of validBookmarks) {
        const added = Number(bookmark.dateAdded) || 0;
        const year = added ? new Date(added).getFullYear() : null;
        let key;
        if (!year) key = '📅 未知时间';
        else if (year >= currentYear) key = '📅 今年';
        else if (year === currentYear - 1) key = '📅 去年';
        else key = `📅 ${year} 年`;
        if (!dateGroups.has(key)) dateGroups.set(key, []);
        dateGroups.get(key).push(bookmark);
      }
      const sortedDate = Array.from(dateGroups.entries())
        .map(([name, items]) => ({ name, items }))
        .sort((a, b) => b.items.length - a.items.length)
        .filter(group => group.items.length >= minGroup);
      state.archiveGroups = sortedDate;
      state.archiveFilterOptions = sortedDate.map(g => g.name).filter(Boolean);
      updateArchiveBulkTargetOptions();
      updateArchiveFilterOptions();
      renderArchiveResults(sortedDate);
      return;
    }

    const allGroups = computeArchiveGroups(validBookmarks, mode, groupKeys, []);
    const preferred = state.archiveGroupSelections;
    const result = preferred.length
      ? computeArchiveGroups(validBookmarks, mode, groupKeys, preferred)
      : allGroups;

    state.archiveGroups = result;
    // 只使用实际存在书签的分组名称
    const allGroupNames = allGroups.map(group => group.name).filter(Boolean);
    state.archiveFilterOptions = allGroupNames;
    if (elements.archiveKeywordFilter) {
      state.archiveKeywordFilter = elements.archiveKeywordFilter.value.trim();
    }
    if (elements.archiveFilter) {
      state.archiveGroupFilterText = elements.archiveFilter.value;
    }
    updateArchiveBulkTargetOptions();
    updateArchiveFilterOptions();
    renderArchiveResults(result);
  }

  function updateArchiveFilterOptions() {
    if (!elements.archiveFilter) return;
    const current = elements.archiveFilter.value;

    // 只使用实际存在书签的分组，按数量排序
    const actualGroups = state.archiveGroups || [];
    const names = actualGroups
      .filter(group => group.items && group.items.length > 0)
      .map(group => group.name)
      .filter(Boolean);

    elements.archiveFilter.textContent = '';

    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = t('all_groups') + ` (${actualGroups.length} ${t('archive_items') || '个分类'})`;
    elements.archiveFilter.appendChild(allOption);

    // 显示每个分类及其书签数量
    names.forEach(name => {
      const group = actualGroups.find(g => g.name === name);
      const count = group ? group.items.length : 0;
      const option = document.createElement('option');
      option.value = name;
      option.textContent = `${name} (${count})`;
      elements.archiveFilter.appendChild(option);
    });

    if (current && names.includes(current)) {
      elements.archiveFilter.value = current;
    } else {
      elements.archiveFilter.value = '';
    }

    // 更新复选框分组筛选器
    if (elements.archiveFilterChecks) {
      elements.archiveFilterChecks.textContent = '';
      state.archiveGroupSelections = state.archiveGroupSelections.filter(name => names.includes(name));
      names.forEach(name => {
        const group = actualGroups.find(g => g.name === name);
        const count = group ? group.items.length : 0;
        const label = document.createElement('label');
        label.className = 'check';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'archive-filter-check';
        input.dataset.name = name;
        input.checked = state.archiveGroupSelections.includes(name);
        const span = document.createElement('span');
        span.textContent = `${name} (${count})`;
        label.appendChild(input);
        label.appendChild(span);
        elements.archiveFilterChecks.appendChild(label);
      });
    }
  }

  async function getArchiveFolderOptions(rootId) {
    const tree = await getTree();
    return getDescendantFolderTitles(tree, rootId);
  }

  function renderArchiveResults(groups) {
    elements.archiveResults.textContent = '';

    if (!groups.length) {
      const empty = document.createElement('div');
      empty.className = 'result-group';
      empty.textContent = t('no_archive');
      elements.archiveResults.appendChild(empty);
      elements.archiveSelectAll.disabled = true;
      elements.archiveRun.disabled = true;
      return;
    }

    const keywordTerms = parseArchiveKeywords(state.archiveKeywordFilter);
    const groupFilter = state.archiveGroupFilterText;
    const selectedGroups = new Set(state.archiveGroupSelections);
    const hasSelection = selectedGroups.size > 0;
    let hasVisible = false;
    const frag = document.createDocumentFragment();

    groups.forEach(group => {
      if (hasSelection) {
        if (!selectedGroups.has(group.name) && group.name !== ARCHIVE_OTHER_LABEL) return;
      } else if (groupFilter && group.name !== groupFilter) {
        return;
      }
      const visibleItems = keywordTerms.length
        ? group.items.filter(item => matchesArchiveKeywords(item, keywordTerms))
        : group.items;
      if (!visibleItems.length) return;
      hasVisible = true;

      const paging = state.archivePaging[group.name] || { page: 1, size: 20 };
      const totalPages = Math.max(1, Math.ceil(visibleItems.length / paging.size));
      if (paging.page > totalPages) paging.page = totalPages;
      state.archivePaging[group.name] = paging;

      const start = (paging.page - 1) * paging.size;
      const end = start + paging.size;
      const pageItems = visibleItems.slice(start, end);

      const groupEl = document.createElement('div');
      groupEl.className = 'result-group archive-group';
      groupEl.dataset.name = group.name;
      const header = document.createElement('div');
      header.className = 'archive-group-header';
      const title = document.createElement('h3');
      title.textContent = `${group.name}（${visibleItems.length} ${t('archive_items')}）`;
      header.appendChild(title);

      const controls = document.createElement('div');
      controls.className = 'archive-group-controls';
      const sizeLabel = document.createElement('span');
      sizeLabel.textContent = t('page_size');
      const sizeSelect = document.createElement('select');
      sizeSelect.className = 'archive-page-size';
      sizeSelect.dataset.group = group.name;
      [10, 20, 50, 100].forEach(size => {
        const opt = document.createElement('option');
        opt.value = String(size);
        opt.textContent = String(size);
        if (paging.size === size) opt.selected = true;
        sizeSelect.appendChild(opt);
      });

      const pageControls = document.createElement('div');
      pageControls.className = 'page-controls';
      const prevBtn = document.createElement('button');
      prevBtn.className = 'btn secondary small archive-page-prev';
      prevBtn.textContent = t('prev');
      prevBtn.dataset.group = group.name;
      prevBtn.disabled = paging.page <= 1;
      const pageInfo = document.createElement('span');
      pageInfo.textContent = `${t('page')} ${paging.page}/${totalPages}`;
      const nextBtn = document.createElement('button');
      nextBtn.className = 'btn secondary small archive-page-next';
      nextBtn.textContent = t('next');
      nextBtn.dataset.group = group.name;
      nextBtn.disabled = paging.page >= totalPages;

      pageControls.appendChild(prevBtn);
      pageControls.appendChild(pageInfo);
      pageControls.appendChild(nextBtn);

      controls.appendChild(sizeLabel);
      controls.appendChild(sizeSelect);
      controls.appendChild(pageControls);
      header.appendChild(controls);

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.className = 'archive-checkbox';
      checkbox.dataset.name = group.name;
      header.prepend(checkbox);

      groupEl.appendChild(header);

      const itemsWrap = document.createElement('div');
      itemsWrap.className = 'archive-group-items';
      if (visibleItems.length > 10) {
        itemsWrap.classList.add('columns');
      }

      const optionSet = new Set([...state.archiveFolderOptions, ...state.archiveGroups.map(g => g.name)]);
      optionSet.add(group.name);
      const folderOptions = Array.from(optionSet).filter(Boolean);

      pageItems.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'item archive-item';
        const info = document.createElement('div');
        const titleRow = document.createElement('div');
        titleRow.className = 'title';
        titleRow.textContent = item.title || '';

        const urlRow = document.createElement('div');
        urlRow.className = 'url';
        const link = document.createElement('a');
        link.href = item.url || '';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = item.url || '';
        urlRow.appendChild(link);

        info.appendChild(titleRow);
        info.appendChild(urlRow);
        const previewBtn = document.createElement('button');
        previewBtn.className = 'btn small preview-link';
        previewBtn.textContent = t('preview');
        previewBtn.dataset.url = item.url;

        const targetWrap = document.createElement('div');
        targetWrap.className = 'meta';
        const targetLabel = document.createElement('span');
        targetLabel.textContent = `${t('archive_move_to')}：`;
        const targetSelect = document.createElement('select');
        targetSelect.className = 'archive-target';
        targetSelect.dataset.id = item.id;
        const defaultTarget = state.archiveItemTargets[item.id] || group.name;
        folderOptions.forEach(name => {
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          if (name === defaultTarget) opt.selected = true;
          targetSelect.appendChild(opt);
        });
        targetWrap.appendChild(targetLabel);
        targetWrap.appendChild(targetSelect);

        itemEl.appendChild(info);
        itemEl.appendChild(previewBtn);
        itemEl.appendChild(targetWrap);
        itemsWrap.appendChild(itemEl);
      });

      groupEl.appendChild(itemsWrap);

      frag.appendChild(groupEl);
    });

    elements.archiveResults.appendChild(frag);
    if (!hasVisible) {
      elements.archiveResults.textContent = '';
      const empty = document.createElement('div');
      empty.className = 'result-group';
      empty.textContent = t('no_archive');
      elements.archiveResults.appendChild(empty);
      elements.archiveSelectAll.disabled = true;
      elements.archiveRun.disabled = true;
      return;
    }

    elements.archiveSelectAll.disabled = false;
    elements.archiveRun.disabled = false;
  }

  function applyArchiveBulkTarget() {
    if (!elements.archiveBulkTarget) return;
    const target = elements.archiveBulkTarget.value;
    if (!target) return;

    const keywordTerms = parseArchiveKeywords(elements.archiveKeywordFilter?.value || state.archiveKeywordFilter);
    const groupFilter = elements.archiveFilter?.value || '';
    const selectedGroups = new Set(state.archiveGroupSelections);

    state.archiveGroups.forEach(group => {
      if (selectedGroups.size && !selectedGroups.has(group.name)) return;
      if (!selectedGroups.size && groupFilter && group.name !== groupFilter) return;
      group.items.forEach(item => {
        if (!matchesArchiveKeywords(item, keywordTerms)) return;
        state.archiveItemTargets[item.id] = target;
      });
    });

    if (elements.archiveKeywordFilter) {
      state.archiveKeywordFilter = elements.archiveKeywordFilter.value.trim();
    }
    renderArchiveResults(state.archiveGroups);
  }

  async function ensureSubFolder(parentId, title) {
    const children = await getChildren(parentId);
    const existing = children.find(item => !item.url && item.title === title);
    if (existing) return existing.id;
    return new Promise((resolve, reject) => {
      chrome.bookmarks.create({ parentId, title }, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result.id);
        }
      });
    });
  }

  async function runArchive() {
    const selected = Array.from(document.querySelectorAll('.archive-checkbox'))
      .filter(cb => cb.checked)
      .map(cb => cb.dataset.name);

    console.log('Run Archive: Selected groups:', selected);

    if (!selected.length) return;

    const rootId = elements.archiveRoot.value;
    if (!rootId) {
      console.warn('Run Archive: No root ID selected');
      return;
    }

    const keywordTerms = parseArchiveKeywords(state.archiveKeywordFilter);
    const moves = [];
    const sourceParentIds = new Set();

    await AutoBackup.capture('书签归档', {
      count: selected.length,
      groups: selected.slice(0, 50)
    });

    for (const groupName of selected) {
      // Debug: Check if group exists
      const group = state.archiveGroups.find(g => g.name === groupName);
      if (!group) {
        console.warn('Run Archive: Group not found in state:', groupName);
        continue;
      }

      const itemsToArchive = keywordTerms.length
        ? group.items.filter(item => matchesArchiveKeywords(item, keywordTerms))
        : group.items;

      console.log(`Run Archive: Group "${groupName}" items to archive:`, itemsToArchive.length);

      if (!itemsToArchive.length) continue;
      for (const bookmark of itemsToArchive) {
        const targetName = state.archiveItemTargets[bookmark.id] || groupName;
        // console.log(`Moving ${bookmark.id} to ${targetName}`);

        try {
          const folderId = await ensureSubFolder(rootId, targetName);
          if (bookmark.parentId === folderId) continue;

          sourceParentIds.add(bookmark.parentId);
          moves.push({ id: bookmark.id, parentId: bookmark.parentId, index: bookmark.index });
          await moveNode(bookmark.id, { parentId: folderId });
        } catch (err) {
          console.error('Failed to move bookmark:', bookmark.id, err);
        }
      }
    }

    setUndo(t('undo_archive'), moves);

    // Auto delete empty source folders
    let deletedCount = 0;
    for (const parentId of sourceParentIds) {
      try {
        const children = await getChildren(parentId);
        if (children.length === 0) {
          const node = await getNode(parentId);
          // Safety: Don't delete root (0), bar (1), other (2) or mobile (3)
          if (node && !['0', '1', '2', '3'].includes(node.id) && node.parentId !== '0') {
            await removeTree(parentId);
            deletedCount++;
          }
        }
      } catch (e) {
        console.warn('Failed to delete empty folder', parentId, e);
      }
    }

    if (deletedCount > 0) {
      // Ideally use a toast, but alert is acceptable for now per user style
      alert(`归档完成。\n移动书签：${moves.length}\n清理空文件夹：${deletedCount}`);
    } else {
      // Add feedback if only moves happened
      if (moves.length > 0) {
        alert(`归档完成。\n移动书签：${moves.length}`);
      } else {
        alert('归档完成，没有书签被移动。');
      }
    }

    await buildArchivePreview();
  }

  async function undoLastAction() {
    if (!state.lastUndo || !state.lastUndo.moves.length) return;

    const moves = state.lastUndo.moves.slice().reverse();
    for (const move of moves) {
      try {
        await moveNode(move.id, { parentId: move.parentId, index: move.index });
      } catch (error) {
        console.warn('撤销失败:', error);
      }
    }

    clearUndo();
  }

  async function clearTrash() {
    if (!confirm(t('confirm_clear_trash'))) return;
    const tree = await getTree();
    const trashId = await ensureTrashFolder(tree);
    const children = await getChildren(trashId);
    for (const child of children) {
      try {
        await removeTree(child.id);
      } catch (error) {
        console.warn('清空回收站失败:', error);
      }
    }
  }

  function selectAll(selector) {
    const checkboxes = Array.from(document.querySelectorAll(selector));
    checkboxes.forEach(cb => {
      if (!cb.disabled) cb.checked = true;
    });
  }

  function updateBrokenProgress(done, total) {
    if (!elements.brokenProgress) return;
    elements.brokenProgress.classList.remove('hidden');
    const percent = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
    elements.brokenProgressBar.style.width = `${percent}%`;
    elements.brokenProgressText.textContent = total
      ? t('checking', { done, total })
      : t('checking_ready');
  }

  async function scanBrokenBookmarks() {
    // 如果已经在运行，不要重复启动
    if (state.brokenScanRunning) return;

    const includeEmpty = elements.brokenEmpty.checked;
    const includeInvalid = elements.brokenInvalid.checked;
    const includeTimeout = elements.brokenTimeout.checked;
    const includeStatus = elements.brokenStatus.checked;
    const timeoutSeconds = Math.max(2, Math.min(30, Number(elements.brokenTimeoutSeconds.value || 8)));
    const concurrency = Math.max(1, Math.min(10, Number(elements.brokenConcurrency.value || 4)));

    const { tree, bookmarks } = await getAllData();
    const trashId = await ensureTrashFolder(tree);
    const targets = bookmarks.filter(b => b.url && !b.path.includes(TRASH_TITLE) && b.parentId !== trashId);

    const results = [];
    state.brokenPaging = {};
    state.brokenScanRunning = true;
    state.brokenScanPaused = false;

    // 显示暂停按钮
    const pauseBtn = document.getElementById('broken-pause');
    if (pauseBtn) {
      pauseBtn.classList.remove('hidden');
      pauseBtn.textContent = t('pause');
      pauseBtn.classList.remove('paused');
    }

    const queue = targets.slice();
    let completed = 0;
    updateBrokenProgress(0, queue.length);

    // 等待暂停状态解除的函数
    const waitIfPaused = () => {
      return new Promise(resolve => {
        const check = () => {
          if (!state.brokenScanPaused) {
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
    };

    const runWorker = async () => {
      while (queue.length && state.brokenScanRunning) {
        // 检查是否暂停
        await waitIfPaused();

        if (!state.brokenScanRunning) break;

        const bookmark = queue.shift();
        if (!bookmark) continue;
        const result = await checkBookmark(bookmark, timeoutSeconds);
        completed += 1;
        updateBrokenProgress(completed, targets.length);

        // 暂停时更新进度文本
        if (state.brokenScanPaused && elements.brokenProgressText) {
          elements.brokenProgressText.textContent = `${t('paused')} - ${completed}/${targets.length}`;
        }

        if (!result) continue;

        if (result.reason === 'empty' && !includeEmpty) continue;
        if (result.reason === 'invalid' && !includeInvalid) continue;
        if (result.reason === 'timeout' && !includeTimeout) continue;
        if (result.reason === 'status' && !includeStatus) continue;

        results.push(result);
      }
    };

    const workers = Array.from({ length: concurrency }, () => runWorker());
    await Promise.all(workers);

    state.brokenScanRunning = false;
    state.brokenScanPaused = false;

    // 隐藏暂停按钮
    if (pauseBtn) {
      pauseBtn.classList.add('hidden');
    }

    state.brokenBookmarks = results;
    renderBrokenResults(results);
    updateBrokenProgress(targets.length, targets.length);
    if (elements.brokenProgressText) {
      elements.brokenProgressText.textContent = targets.length
        ? t('checked_done', { total: targets.length })
        : t('checked_none');
    }
  }

  // 暂停/继续检测
  function toggleBrokenScanPause() {
    if (!state.brokenScanRunning) return;

    state.brokenScanPaused = !state.brokenScanPaused;
    const pauseBtn = document.getElementById('broken-pause');

    if (pauseBtn) {
      if (state.brokenScanPaused) {
        pauseBtn.textContent = t('resume');
        pauseBtn.classList.add('paused');
      } else {
        pauseBtn.textContent = t('pause');
        pauseBtn.classList.remove('paused');
      }
    }
  }

  function renderBrokenResults(results) {
    elements.brokenResults.textContent = '';

    if (!results.length) {
      const empty = document.createElement('div');
      empty.className = 'result-group';
      empty.textContent = t('no_broken');
      elements.brokenResults.appendChild(empty);
      elements.brokenSelectAll.disabled = true;
      elements.brokenDelete.disabled = true;
      if (elements.brokenDeleteDirect) elements.brokenDeleteDirect.disabled = true;
      if (elements.brokenProgress) elements.brokenProgress.classList.add('hidden');
      return;
    }

    const groups = new Map();
    results.forEach(item => {
      const key = item.label;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });

    const frag = document.createDocumentFragment();
    Array.from(groups.entries()).forEach(([label, items]) => {
      const paging = state.brokenPaging[label] || { page: 1, size: 20 };
      const totalPages = Math.max(1, Math.ceil(items.length / paging.size));
      if (paging.page > totalPages) paging.page = totalPages;
      state.brokenPaging[label] = paging;

      const start = (paging.page - 1) * paging.size;
      const end = start + paging.size;
      const pageItems = items.slice(start, end);

      const groupEl = document.createElement('div');
      groupEl.className = 'result-group';
      const header = document.createElement('div');
      header.className = 'archive-group-header';
      const title = document.createElement('h3');
      title.textContent = `${label}（${items.length} ${t('archive_items')}）`;
      header.appendChild(title);

      const controls = document.createElement('div');
      controls.className = 'archive-group-controls';
      const sizeLabel = document.createElement('span');
      sizeLabel.textContent = t('page_size');
      const sizeSelect = document.createElement('select');
      sizeSelect.className = 'broken-page-size';
      sizeSelect.dataset.group = label;
      [10, 20, 50, 100].forEach(size => {
        const opt = document.createElement('option');
        opt.value = String(size);
        opt.textContent = String(size);
        if (paging.size === size) opt.selected = true;
        sizeSelect.appendChild(opt);
      });

      const pageControls = document.createElement('div');
      pageControls.className = 'page-controls';
      const prevBtn = document.createElement('button');
      prevBtn.className = 'btn secondary small broken-page-prev';
      prevBtn.textContent = t('prev');
      prevBtn.dataset.group = label;
      prevBtn.disabled = paging.page <= 1;
      const pageInfo = document.createElement('span');
      pageInfo.textContent = `${t('page')} ${paging.page}/${totalPages}`;
      const nextBtn = document.createElement('button');
      nextBtn.className = 'btn secondary small broken-page-next';
      nextBtn.textContent = t('next');
      nextBtn.dataset.group = label;
      nextBtn.disabled = paging.page >= totalPages;

      pageControls.appendChild(prevBtn);
      pageControls.appendChild(pageInfo);
      pageControls.appendChild(nextBtn);

      controls.appendChild(sizeLabel);
      controls.appendChild(sizeSelect);
      controls.appendChild(pageControls);
      header.appendChild(controls);

      groupEl.appendChild(header);

      const itemsWrap = document.createElement('div');
      itemsWrap.className = 'archive-group-items';
      if (items.length > 10) {
        itemsWrap.classList.add('columns');
      }

      pageItems.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'item archive-item';
        itemEl.dataset.id = item.id;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.id = item.id;
        checkbox.className = 'broken-checkbox';
        checkbox.checked = true;

        const info = document.createElement('div');
        const titleRow = document.createElement('div');
        titleRow.className = 'title';
        titleRow.textContent = item.title || '';

        const urlRow = document.createElement('div');
        urlRow.className = 'url';
        const link = document.createElement('a');
        link.href = item.url || '';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = item.url || t('empty_link');
        urlRow.appendChild(link);

        const reasonRow = document.createElement('div');
        reasonRow.className = 'meta';
        reasonRow.textContent = `${t('reason')}：${item.detail || ''}`;

        const pathRow = document.createElement('div');
        pathRow.className = 'meta';
        const pathText = (item.path && item.path.join(' / ')) || '根目录';
        pathRow.textContent = `${t('path')}：${pathText}`;

        info.appendChild(titleRow);
        info.appendChild(urlRow);
        info.appendChild(reasonRow);
        info.appendChild(pathRow);
        const previewBtn = document.createElement('button');
        previewBtn.className = 'btn small preview-link';
        previewBtn.textContent = t('preview');
        previewBtn.dataset.url = item.url;
        info.appendChild(previewBtn);

        itemEl.appendChild(checkbox);
        itemEl.appendChild(info);
        itemsWrap.appendChild(itemEl);
      });

      groupEl.appendChild(itemsWrap);
      frag.appendChild(groupEl);
    });

    elements.brokenResults.appendChild(frag);
    elements.brokenSelectAll.disabled = false;
    elements.brokenDelete.disabled = false;
    if (elements.brokenDeleteDirect) elements.brokenDeleteDirect.disabled = false;
  }

  async function deleteSelectedBroken() {
    const checkboxes = Array.from(document.querySelectorAll('.broken-checkbox'));
    const selected = checkboxes.filter(cb => cb.checked).map(cb => cb.dataset.id);
    if (!selected.length) return;

    const moves = await moveSelectedToTrash(selected, '删除异常书签');
    if (moves.length) {
      setUndo(t('undo_delete_broken'), moves);
    }
    await scanBrokenBookmarks();
  }

  async function deleteSelectedBrokenDirect() {
    const checkboxes = Array.from(document.querySelectorAll('.broken-checkbox'));
    const selected = checkboxes.filter(cb => cb.checked).map(cb => cb.dataset.id);
    if (!selected.length) return;
    if (!confirm(t('confirm_delete_direct_broken'))) return;

    for (const id of selected) {
      await new Promise((resolve, reject) => {
        chrome.bookmarks.remove(id, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    }

    clearUndo();
    await scanBrokenBookmarks();
  }

  async function fetchWithTimeout(url, options, timeoutSeconds) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutSeconds * 1000);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      return { response };
    } catch (error) {
      return { error };
    } finally {
      clearTimeout(timeout);
    }
  }

  async function probeBookmarkUrl(url, timeoutSeconds) {
    const head = await fetchWithTimeout(
      url,
      {
        method: 'HEAD',
        cache: 'no-store',
        redirect: 'follow',
        credentials: 'include'
      },
      timeoutSeconds
    );

    if (head.response) {
      if (head.response.type === 'opaque') return { ok: true };
      if (head.response.status < 400) return { ok: true, status: head.response.status };
    }

    const get = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        cache: 'no-store',
        redirect: 'follow',
        credentials: 'include',
        headers: { Range: 'bytes=0-0' }
      },
      timeoutSeconds
    );

    if (get.response) {
      if (get.response.type === 'opaque') return { ok: true };
      if (get.response.status < 400) return { ok: true, status: get.response.status };
      return { ok: false, status: get.response.status };
    }

    const timeout = (get.error && get.error.name === 'AbortError')
      || (head.error && head.error.name === 'AbortError');
    const status = head.response && head.response.status >= 400 ? head.response.status : null;
    return {
      ok: false,
      status,
      error: get.error || head.error,
      timeout
    };
  }

  async function checkBookmark(bookmark, timeoutSeconds) {
    const engine = typeof globalThis !== 'undefined' ? globalThis.SMLinkChecker : null;
    if (engine && typeof engine.checkBookmark === 'function') {
      const result = await engine.checkBookmark(
        {
          id: bookmark.id,
          url: bookmark.url || '',
          title: bookmark.title || '',
          path: bookmark.path || []
        },
        { timeoutMs: Math.max(2000, Number(timeoutSeconds) * 1000 || 8000), retries: 1 }
      );
      if (result.status === 'ok' || result.status === 'redirect') return null;
      const map = {
        empty: ['empty', '空链接', '链接为空'],
        invalid: ['invalid', '无效URL', result.reason || 'URL解析失败'],
        unsupported: ['invalid', '无效URL', result.reason || '不支持的协议'],
        timeout: ['timeout', '超时', `超过 ${timeoutSeconds}s`],
        broken: ['status', '状态码异常', `HTTP ${result.httpStatus}`],
        server_error: ['status', '状态码异常', `HTTP ${result.httpStatus}`],
        blocked: ['status', '访问受限', `HTTP ${result.httpStatus}`]
      };
      const mapped = map[result.status] || ['status', '无法访问', result.reason || '请求失败'];
      return buildBroken(bookmark, mapped[0], mapped[1], mapped[2]);
    }

    const url = (bookmark.url || '').trim();
    if (!url) {
      return buildBroken(bookmark, 'empty', '空链接', '链接为空');
    }

    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return buildBroken(bookmark, 'invalid', '无效URL', 'URL解析失败');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return buildBroken(bookmark, 'invalid', '无效URL', `不支持的协议：${parsed.protocol}`);
    }

    const probe = await probeBookmarkUrl(url, timeoutSeconds);
    if (probe.ok) return null;
    if (probe.timeout) {
      return buildBroken(bookmark, 'timeout', '超时', `超过 ${timeoutSeconds}s`);
    }
    if (probe.status) {
      return buildBroken(bookmark, 'status', '状态码异常', `HTTP ${probe.status}`);
    }
    return buildBroken(bookmark, 'status', '无法访问', probe.error?.message || '请求失败');
  }

  function buildBroken(bookmark, reason, label, detail) {
    return {
      id: bookmark.id,
      title: bookmark.title || '未命名书签',
      url: bookmark.url || '',
      path: bookmark.path || [],
      reason,
      label,
      detail
    };
  }

  function applySmartSelection(strategy) {
    if (!state.duplicateGroups.length) return;

    const pickKeep = (items) => {
      if (!items.length) return null;
      if (strategy === 'oldest') {
        return items.reduce((min, item) => (item.dateAdded < min.dateAdded ? item : min), items[0]);
      }
      if (strategy === 'newest') {
        return items.reduce((max, item) => (item.dateAdded > max.dateAdded ? item : max), items[0]);
      }
      if (strategy === 'longestUrl') {
        return items.reduce((max, item) => ((item.url || '').length > (max.url || '').length ? item : max), items[0]);
      }
      if (strategy === 'shortestUrl') {
        return items.reduce((min, item) => ((item.url || '').length < (min.url || '').length ? item : min), items[0]);
      }
      if (strategy === 'longestTitle') {
        return items.reduce((max, item) => ((item.title || '').length > (max.title || '').length ? item : max), items[0]);
      }
      if (strategy === 'shortestTitle') {
        return items.reduce((min, item) => ((item.title || '').length < (min.title || '').length ? item : min), items[0]);
      }
      return items[0];
    };

    state.duplicateGroups.forEach(group => {
      const keepItem = pickKeep(group.items);
      if (!keepItem) return;
      group.items.forEach(item => {
        const checkbox = document.querySelector(`.dup-checkbox[data-id="${item.id}"]`);
        if (checkbox) {
          checkbox.checked = item.id !== keepItem.id;
        }
        const row = document.querySelector(`.dup-item[data-id="${item.id}"]`);
        if (row) {
          row.classList.toggle('keep', item.id === keepItem.id);
        }
        const label = document.querySelector(`.recommend[data-id="${item.id}"]`);
        if (label) {
          label.textContent = item.id === keepItem.id ? '(推荐保留)' : '';
        }
      });
    });
  }

  function setTransferStatus(element, message, tone = '') {
    if (!element) return;
    element.textContent = message || '';
    element.classList.remove('success', 'error', 'info');
    if (tone) {
      element.classList.add(tone);
    }
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function formatStampForFilename() {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}_${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
  }

  function formatStampForFolder() {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}${pad2(now.getMinutes())}`;
  }

  function buildExportFilename() {
    const raw = (elements.exportFilename?.value || '').trim();
    const format = elements.exportFormat?.value || 'json';
    const ext = format === 'html' ? '.html' : '.json';
    const fallback = `bookmark-export-${formatStampForFilename()}${ext}`;

    let name = raw || fallback;
    name = name.replace(/[\\/:*?"<>|]+/g, '-').trim();

    // Auto-correct extension
    if (!name.toLowerCase().endsWith(ext)) {
      if (name.toLowerCase().endsWith('.json')) name = name.slice(0, -5);
      if (name.toLowerCase().endsWith('.html')) name = name.slice(0, -5);
      name += ext;
    }
    return name;
  }

  function dateToUnix(ms) {
    return Math.floor((ms || Date.now()) / 1000);
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  }

  function jsonToNetscapeHtml(nodes, title = 'Bookmarks') {
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>${escapeHtml(title)}</TITLE>
<H1>${escapeHtml(title)}</H1>
<DL><p>
`;

    function traverse(node, indent) {
      let output = '';
      const pad = '    '.repeat(indent);

      if (node.url) {
        output += `${pad}<DT><A HREF="${escapeHtml(node.url)}" ADD_DATE="${dateToUnix(node.dateAdded)}">${escapeHtml(node.title)}</A>\n`;
      } else if (node.children) {
        output += `${pad}<DT><H3 ADD_DATE="${dateToUnix(node.dateAdded)}" LAST_MODIFIED="${dateToUnix(node.dateGroupModified)}">${escapeHtml(node.title)}</H3>\n`;
        output += `${pad}<DL><p>\n`;
        node.children.forEach(child => {
          output += traverse(child, indent + 1);
        });
        output += `${pad}</DL><p>\n`;
      }
      return output;
    }

    if (Array.isArray(nodes)) {
      nodes.forEach(node => {
        // If node is root (id 0), iterate its children to avoid creating an extra root folder visual
        if (node.id === '0') {
          node.children.forEach(child => html += traverse(child, 1));
        } else {
          html += traverse(node, 1);
        }
      });
    }

    html += '</DL><p>';
    return html;
  }

  function parseNetscapeHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    function parseContainer(container) {
      const items = [];
      const children = Array.from(container.childNodes);

      for (const node of children) {
        if (node.tagName === 'DT') {
          const h3 = node.querySelector('h3');
          const a = node.querySelector('a');

          if (h3) {
            const title = h3.textContent;
            const date = h3.getAttribute('ADD_DATE');
            const dateAdded = date ? parseInt(date) * 1000 : Date.now();

            // Find DL child or sibling
            let dl = node.querySelector('dl');
            if (!dl) {
              let next = node.nextSibling;
              while (next && next.tagName !== 'DT' && next.tagName !== 'DL') {
                next = next.nextSibling;
              }
              if (next && next.tagName === 'DL') dl = next;
            }

            items.push({
              title,
              dateAdded,
              children: dl ? parseContainer(dl) : []
            });
          } else if (a) {
            const date = a.getAttribute('ADD_DATE');
            items.push({
              title: a.textContent,
              url: a.href,
              dateAdded: date ? parseInt(date) * 1000 : Date.now()
            });
          }
        }
      }
      return items;
    }

    const rootDl = doc.querySelector('dl');
    return rootDl ? parseContainer(rootDl) : [];
  }

  function normalizeBookmarkImportNodes(raw) {
    if (!raw) return [];
    const list = Array.isArray(raw) ? raw : [raw];
    if (list.length === 1 && list[0] && list[0].children && !list[0].url) {
      // If the root is a folder (like "Bookmarks Bar"), return its children
      // But only if it has no siblings.
      // Actually, let's keep it simple. If we parsed HTML, we get a list of roots.
      return list[0].children || [];
    }
    return list;
  }

  function normalizeTabImportList(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      if (raw.length && raw[0] && Array.isArray(raw[0].tabs)) {
        return raw.flatMap(window => window?.tabs || []);
      }
      return raw;
    }
    if (Array.isArray(raw.tabs)) return raw.tabs;
    if (Array.isArray(raw.windows)) {
      return raw.windows.flatMap(window => window?.tabs || []);
    }
    return [];
  }

  function isHttpUrl(url) {
    return /^https?:/i.test(url || '');
  }

  async function importBookmarkNodes(nodes, parentId) {
    let count = 0;
    for (const node of nodes) {
      count += await importBookmarkNode(node, parentId);
    }
    return count;
  }

  async function importBookmarkNode(node, parentId) {
    if (!node) return 0;
    if (node.url) {
      const title = node.title || node.url || '未命名书签';
      await createBookmark({ parentId, title, url: node.url });
      return 1;
    }

    // Create folder
    const folderTitle = node.title || '未命名文件夹';
    const folder = await createBookmark({ parentId, title: folderTitle });
    let count = 0;
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        count += await importBookmarkNode(child, folder.id);
      }
    }
    return count;
  }

  function downloadJson(content, filename, type = 'application/json') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function writeClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!success) throw new Error('copy_failed');
    return true;
  }

  async function handleExport(mode) {
    setTransferStatus(elements.exportResult, '', '');
    const includeBookmarks = !!elements.exportBookmarks?.checked;
    const includeTabs = !!elements.exportTabs?.checked;
    const format = elements.exportFormat?.value || 'json';

    if (!includeBookmarks && !includeTabs) {
      setTransferStatus(elements.exportResult, t('export_no_selection'), 'error');
      return;
    }

    try {
      let bookmarkCount = 0;
      let tabCount = 0;
      let tabsError = null;
      let bookmarksData = [];
      let tabsData = [];

      // 1. Gather Data
      if (includeBookmarks) {
        const { tree, bookmarks } = await getAllData();
        bookmarksData = tree;
        bookmarkCount = bookmarks.length;
      }

      if (includeTabs) {
        const { tabs, error } = await queryTabs();
        tabsError = error;
        if (!error) {
          const normalizedTabs = (tabs || [])
            .map(tab => ({
              title: tab.title || '',
              url: tab.url || '',
              pinned: !!tab.pinned,
              active: !!tab.active,
              windowId: tab.windowId
            }))
            .filter(tab => tab.url);
          tabsData = normalizedTabs;
          tabCount = normalizedTabs.length;
        }
      }

      // 2. Generate Content
      let content = '';
      let mimeType = 'application/json';

      if (format === 'html') {
        // Merge tabs into bookmarks tree for HTML export
        const exportRoot = [...bookmarksData];
        if (tabsData.length) {
          exportRoot.push({
            title: 'Exported Tabs',
            dateAdded: Date.now(),
            dateGroupModified: Date.now(),
            children: tabsData.map(t => ({ title: t.title, url: t.url, dateAdded: Date.now() }))
          });
        }
        content = jsonToNetscapeHtml(exportRoot);
        mimeType = 'text/html';
      } else {
        // JSON
        const payload = {
          version: 1,
          exportedAt: new Date().toISOString(),
          source: 'Bookmark Organizer',
          bookmarks: bookmarksData,
          tabs: tabsData,
          meta: { bookmarkCount, tabCount }
        };
        content = JSON.stringify(payload, null, 2);
      }

      if (mode === 'copy') {
        await writeClipboard(content);
      } else {
        downloadJson(content, buildExportFilename(), mimeType);
      }

      let message = t('export_done', { bookmarks: bookmarkCount, tabs: tabCount });
      if (mode === 'copy') {
        message = `${t('export_copy_done')} ${message}`;
      }
      if (tabsError && includeTabs) {
        message = `${message} ${t('export_tabs_permission')}`;
      }
      setTransferStatus(elements.exportResult, message, tabsError ? 'info' : 'success');
    } catch (error) {
      console.error(error);
      setTransferStatus(elements.exportResult, t('export_failed', { message: error.message || error }), 'error');
    }
  }

  async function handleImport() {
    setTransferStatus(elements.importResult, '', '');
    const file = elements.importFile?.files?.[0];
    if (!file) {
      setTransferStatus(elements.importResult, t('import_no_file'), 'error');
      return;
    }
    const wantBookmarks = !!elements.importBookmarks?.checked;
    const wantTabs = !!elements.importTabs?.checked;
    if (!wantBookmarks && !wantTabs) {
      setTransferStatus(elements.importResult, t('import_no_selection'), 'error');
      return;
    }

    let data;
    let isHtml = false;
    let rawText = '';

    try {
      rawText = await file.text();
      // Sniff type
      if (rawText.trim().startsWith('<') || file.name.endsWith('.html')) {
        isHtml = true;
        data = parseNetscapeHtml(rawText);
      } else {
        try {
          data = JSON.parse(rawText);
        } catch {
          // Fallback: try HTML parser if JSON failed?
          // Maybe user uploaded HTML but named it txt
          if (rawText.toLowerCase().includes('<!doctype netscape')) {
            isHtml = true;
            data = parseNetscapeHtml(rawText);
          } else {
            throw new Error('Invalid JSON');
          }
        }
      }
    } catch {
      setTransferStatus(elements.importResult, t('import_invalid_file'), 'error');
      return;
    }

    let bookmarkNodes = [];
    let tabItems = [];

    if (isHtml) {
      // HTML is purely bookmark nodes
      // If specific folder "Exported Tabs" exists, we could treat it as tabs?
      // For now, treat everything as bookmarks, unless we want to be fancy.
      // User wants "Import Bookmarks" or "Import Tabs".
      // If user selects "Import Tabs" but file is HTML... we could import links as tabs to open?
      // Let's stick to standard behavior: HTML = Bookmarks.
      if (wantBookmarks) {
        bookmarkNodes = data;
      }
      // If user ONLY checks Tabs, and it's HTML, we currently don't extract Tabs specifically.
      // But we could support flattened list for tabs opening.
      if (wantTabs) {
        function extractLinks(list) {
          return list.flatMap(node => node.url ? [node] : extractLinks(node.children || []));
        }
        tabItems = extractLinks(data);
      }
    } else {
      // JSON
      const bookmarkSource = data?.bookmarks || data?.bookmarkTree || (Array.isArray(data) ? data : null);
      const tabSource = data?.tabs || data?.tabList || data?.windows || null;
      if (wantBookmarks) bookmarkNodes = normalizeBookmarkImportNodes(bookmarkSource);
      if (wantTabs) tabItems = normalizeTabImportList(tabSource);
    }

    if (!bookmarkNodes.length && !tabItems.length) {
      setTransferStatus(elements.importResult, t('import_no_data'), 'error');
      return;
    }

    try {
      const tree = await getTree();
      const targetId = elements.importTarget?.value || await getDefaultRootId(tree);
      const stamp = formatStampForFolder();
      let importedBookmarks = 0;
      let importedTabs = 0;

      // Import Bookmarks
      if (wantBookmarks && bookmarkNodes.length) {
        const rootFolder = await createBookmark({ parentId: targetId, title: `导入书签 ${stamp}` });
        const portable = typeof globalThis !== 'undefined' ? globalThis.SMPortableIO : null;
        const conflictPolicy = elements.importConflict?.value || 'skip';

        // Flatten the parsed tree into engine records so conflict policies apply.
        const flattenForImport = (nodes, path, out) => {
          for (const node of nodes || []) {
            if (!node) continue;
            if (node.url) {
              out.push({ title: node.title || node.url, url: node.url, path: path.slice() });
              continue;
            }
            const nextPath = node.title ? [...path, node.title] : path;
            flattenForImport(node.children || [], nextPath, out);
          }
        };
        const flatRecords = [];
        flattenForImport(bookmarkNodes, [], flatRecords);

        if (portable && typeof portable.importBookmarks === 'function' && flatRecords.length) {
          if (conflictPolicy === 'overwrite') {
            await AutoBackup.capture('导入覆盖前快照', { count: flatRecords.length });
          }
          const adapter = {
            create: (data) => createBookmark(data),
            getChildren: (id) => getChildren(id),
            remove: (id) => new Promise((resolve) => {
              chrome.bookmarks.remove(id, () => resolve());
            })
          };
          const importResult = await portable.importBookmarks(flatRecords, adapter, {
            targetFolderId: rootFolder.id,
            conflictPolicy,
            dedupeByUrl: true
          });
          importedBookmarks += importResult.created;
          if (importResult.skipped) {
            console.info('import skipped', importResult.skipped, 'duplicates');
          }
          if (importResult.failed) {
            console.warn('import failed records', importResult.failed, importResult.errors.slice(0, 5));
          }
        } else {
          importedBookmarks += await importBookmarkNodes(bookmarkNodes, rootFolder.id);
        }
      }

      // Import Tabs (Open or Save as Bookmark)
      if (wantTabs && tabItems.length) {
        const normalizedTabs = tabItems
          .map(tab => ({
            title: tab?.title || '',
            url: tab?.url || tab?.href || tab?.link || ''
          }))
          .filter(tab => tab.url);

        let tabsOpened = 0;

        // Option A: Save tabs as bookmarks in a folder
        if (elements.importTabsBookmark?.checked && normalizedTabs.length) {
          const tabsFolder = await createBookmark({ parentId: targetId, title: `导入标签页 ${stamp}` });
          for (const tab of normalizedTabs) {
            const title = tab.title || tab.url;
            await createBookmark({ parentId: tabsFolder.id, title, url: tab.url });
            importedBookmarks += 1;
          }
          if (isHtml) {
            // if it was HTML, we already imported them as bookmarks above? 
            // Logic differentiation:
            // If JSON: bookmarks and tabs are separate.
            // If HTML: everything is a bookmark.
            // If user checked BOTH for HTML, they get duplicates?
            // Let's prevent that.
            // If isHtml and wantBookmarks was true, we imported everything already.
            // So only do this if (!isHtml) OR (!wantBookmarks)
            if (!isHtml || !wantBookmarks) {
              importedTabs = normalizedTabs.length;
            }
          } else {
            importedTabs = normalizedTabs.length;
          }
        }

        // Option B: Open tabs
        if (elements.importTabsOpen?.checked) {
          const openableTabs = normalizedTabs.filter(tab => isHttpUrl(tab.url));
          if (openableTabs.length > 0) {
            if (openableTabs.length > 20) {
              const confirmed = confirm(t('import_tabs_confirm', { count: openableTabs.length }));
              if (!confirmed) {
                setTransferStatus(elements.importResult, t('import_done', { bookmarks: importedBookmarks, tabs: importedTabs }), 'success');
                return;
              }
            }
            for (const tab of openableTabs) {
              const opened = await createTab(tab.url);
              if (opened) tabsOpened += 1;
            }
            if (!elements.importTabsBookmark?.checked) {
              importedTabs = tabsOpened;
            } else {
              importedTabs = Math.max(importedTabs, tabsOpened);
            }
          }
        }
      }

      setTransferStatus(elements.importResult, t('import_done', { bookmarks: importedBookmarks, tabs: importedTabs }), 'success');
    } catch (error) {
      console.error(error);
      setTransferStatus(elements.importResult, t('import_failed', { message: error.message || error }), 'error');
    }
  }

  function clearImportForm() {
    if (elements.importFile) {
      elements.importFile.value = '';
    }
    setTransferStatus(elements.importResult, '', '');
  }

  async function renderSnapshotList() {
    if (!elements.snapshotResults) return;
    elements.snapshotResults.textContent = '';
    const engine = typeof globalThis !== 'undefined' ? globalThis.SMBackup : null;
    if (!engine) {
      setTransferStatus(elements.snapshotResult, '快照模块不可用', 'error');
      return;
    }
    const list = await engine.listSnapshots();
    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'result-group';
      empty.textContent = '暂无快照';
      elements.snapshotResults.appendChild(empty);
      return;
    }
    const frag = document.createDocumentFragment();
    for (const item of list) {
      const row = document.createElement('div');
      row.className = 'result-group';
      row.dataset.id = item.id;

      const info = document.createElement('div');
      info.className = 'group-header';
      const title = document.createElement('h3');
      const when = new Date(item.createdAt).toLocaleString();
      title.textContent = `${item.action} · ${when}`;
      const stats = document.createElement('span');
      stats.className = 'meta';
      stats.textContent = `${item.stats.bookmarks} 书签 / ${item.stats.folders} 文件夹`;
      info.appendChild(title);
      info.appendChild(stats);

      const actions = document.createElement('div');
      actions.className = 'actions';
      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'btn secondary small';
      restoreBtn.textContent = '还原';
      restoreBtn.addEventListener('click', () => restoreSnapshotById(item.id));
      const exportBtn = document.createElement('button');
      exportBtn.className = 'btn secondary small';
      exportBtn.textContent = '导出 JSON';
      exportBtn.addEventListener('click', () => exportSnapshotById(item.id, 'json'));
      const exportHtmlBtn = document.createElement('button');
      exportHtmlBtn.className = 'btn secondary small';
      exportHtmlBtn.textContent = '导出 HTML';
      exportHtmlBtn.addEventListener('click', () => exportSnapshotById(item.id, 'html'));
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn danger small';
      deleteBtn.textContent = '删除';
      deleteBtn.addEventListener('click', async () => {
        await engine.deleteSnapshot(item.id);
        await renderSnapshotList();
      });
      actions.appendChild(restoreBtn);
      actions.appendChild(exportBtn);
      actions.appendChild(exportHtmlBtn);
      actions.appendChild(deleteBtn);

      row.appendChild(info);
      row.appendChild(actions);
      frag.appendChild(row);
    }
    elements.snapshotResults.appendChild(frag);
  }

  async function createManualSnapshot() {
    const snapshot = await AutoBackup.capture('手动快照', {});
    if (snapshot) {
      setTransferStatus(elements.snapshotResult, `已创建快照：${snapshot.stats.bookmarks} 书签 / ${snapshot.stats.folders} 文件夹`, 'success');
    } else {
      setTransferStatus(elements.snapshotResult, '快照创建失败', 'error');
    }
    await renderSnapshotList();
  }

  async function exportSnapshotById(id, format) {
    const engine = typeof globalThis !== 'undefined' ? globalThis.SMBackup : null;
    if (!engine) return;
    const snapshot = await engine.getSnapshot(id);
    if (!snapshot) return;
    const base = `smartmarkr-snapshot-${snapshot.createdAt.replace(/[:.]/g, '-')}`;
    if (format === 'html') {
      downloadJson(engine.snapshotToHtml(snapshot), `${base}.html`, 'text/html');
    } else {
      downloadJson(engine.snapshotToJson(snapshot), `${base}.json`, 'application/json');
    }
  }

  async function restoreSnapshotById(id) {
    const engine = typeof globalThis !== 'undefined' ? globalThis.SMBackup : null;
    if (!engine) return;
    if (!confirm('还原会用快照内容替换当前书签树，确定继续吗？')) return;

    const snapshot = await engine.getSnapshot(id);
    if (!snapshot) return;
    const { tree } = await getAllData();
    const rootIdMap = {};
    const walkRoots = (node) => { if (node) rootIdMap[node.id] = node.id; };
    (tree || []).forEach((node) => { if (node && node.children) node.children.forEach(walkRoots); });
    if (tree && tree[0]) rootIdMap[tree[0].id] = tree[0].id;

    const adapter = {
      removeTree: removeTree,
      create: createBookmark
    };
    const result = await engine.restoreSnapshot(snapshot, adapter, { rootIdMap });
    setTransferStatus(elements.snapshotResult, `还原完成：新建 ${result.created} 项`, 'success');
    await renderSnapshotList();
  }

  async function clearSnapshots() {
    const engine = typeof globalThis !== 'undefined' ? globalThis.SMBackup : null;
    if (!engine) return;
    if (!confirm('清空全部快照？此操作不可撤销。')) return;
    await engine.clearSnapshots();
    await renderSnapshotList();
  }

  function updateImportTabOptions() {
    const enabled = !!elements.importTabs?.checked;
    if (elements.importTabsOpen) elements.importTabsOpen.disabled = !enabled;
    if (elements.importTabsBookmark) elements.importTabsBookmark.disabled = !enabled;
  }

  // ========== 书签搜索功能 ==========
  async function searchBookmarks() {
    const query = elements.searchInput.value.trim();
    const searchInTitle = elements.searchTitle.checked;
    const searchInUrl = elements.searchUrl.checked;
    const textOnly = elements.searchTextOnly.checked;

    if (!query) {
      setSearchResultsHint(t('search_hint'));
      elements.searchResultStats.textContent = '';
      return;
    }

    if (!searchInTitle && !searchInUrl) {
      setSearchResultsHint('请至少选择一个搜索选项（标题或URL）');
      elements.searchResultStats.textContent = '';
      return;
    }

    const { bookmarks } = await getAllData();
    const searchQuery = textOnly ? query.toLowerCase() : query;

    const results = bookmarks.filter(bookmark => {
      if (searchInTitle) {
        const title = textOnly ? bookmark.title.toLowerCase() : bookmark.title;
        if (title.includes(searchQuery)) return true;
      }
      if (searchInUrl) {
        const url = textOnly ? bookmark.url.toLowerCase() : bookmark.url;
        if (url.includes(searchQuery)) return true;
      }
      return false;
    });

    renderSearchResults(results, searchQuery);
  }

  function setSearchResultsHint(message) {
    elements.searchResults.replaceChildren();
    const hint = document.createElement('p');
    hint.className = 'search-hint';
    hint.textContent = message;
    elements.searchResults.appendChild(hint);
  }

  function buildHighlightFragment(text, query, textOnly) {
    const fragment = document.createDocumentFragment();
    if (!query) {
      fragment.appendChild(document.createTextNode(text));
      return fragment;
    }
    const searchQuery = textOnly ? query.toLowerCase() : query;
    const searchText = textOnly ? text.toLowerCase() : text;
    if (!searchQuery) {
      fragment.appendChild(document.createTextNode(text));
      return fragment;
    }

    let startIndex = 0;
    while (true) {
      const index = searchText.indexOf(searchQuery, startIndex);
      if (index === -1) {
        if (startIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.substring(startIndex)));
        }
        break;
      }
      if (index > startIndex) {
        fragment.appendChild(document.createTextNode(text.substring(startIndex, index)));
      }
      const span = document.createElement('span');
      span.className = 'highlight';
      span.textContent = text.substring(index, index + query.length);
      fragment.appendChild(span);
      startIndex = index + query.length;
    }
    return fragment;
  }

  function renderSearchResults(results, query) {
    if (!results || results.length === 0) {
      setSearchResultsHint(t('search_hint'));
      elements.searchResultStats.textContent = '';
      return;
    }

    elements.searchResultStats.textContent = t('search_result_found', { count: results.length });

    const textOnly = elements.searchTextOnly.checked;
    elements.searchResults.replaceChildren();
    const fragment = document.createDocumentFragment();

    results.forEach(bm => {
      const pathStr = bm.path.length ? bm.path.join(' / ') : t('path');

      const item = document.createElement('div');
      item.className = 'item';

      const container = document.createElement('div');

      const titleEl = document.createElement('div');
      titleEl.className = 'title';
      titleEl.appendChild(buildHighlightFragment(bm.title, query, textOnly));

      const urlEl = document.createElement('div');
      urlEl.className = 'url';
      const link = document.createElement('a');
      link.href = bm.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.appendChild(buildHighlightFragment(bm.url, query, textOnly));
      urlEl.appendChild(link);

      const metaEl = document.createElement('div');
      metaEl.className = 'meta';
      metaEl.textContent = `${t('path')}：${pathStr}`;

      container.appendChild(titleEl);
      container.appendChild(urlEl);
      container.appendChild(metaEl);

      item.appendChild(container);
      fragment.appendChild(item);
    });

    elements.searchResults.appendChild(fragment);
  }

  async function validateSearchResults() {
    const query = elements.searchInput.value.trim();
    if (!query) {
      alert('请先进行搜索');
      return;
    }

    const searchInTitle = elements.searchTitle.checked;
    const searchInUrl = elements.searchUrl.checked;
    const textOnly = elements.searchTextOnly.checked;

    if (!searchInTitle && !searchInUrl) {
      alert('请至少选择一个搜索选项（标题或URL）');
      return;
    }

    const { bookmarks } = await getAllData();
    const searchQuery = textOnly ? query.toLowerCase() : query;

    const results = bookmarks.filter(bookmark => {
      if (searchInTitle) {
        const title = textOnly ? bookmark.title.toLowerCase() : bookmark.title;
        if (title.includes(searchQuery)) return true;
      }
      if (searchInUrl) {
        const url = textOnly ? bookmark.url.toLowerCase() : bookmark.url;
        if (url.includes(searchQuery)) return true;
      }
      return false;
    });

    if (results.length === 0) {
      alert(t('search_hint'));
      return;
    }

    elements.searchResultStats.textContent = t('search_validating');

    let validCount = 0;
    let invalidCount = 0;
    const validatedResults = [];

    for (const bookmark of results) {
      const probe = await probeBookmarkUrl(bookmark.url, 5);
      if (probe.ok) {
        validCount++;
        validatedResults.push({ ...bookmark, valid: true });
      } else {
        invalidCount++;
        validatedResults.push({ ...bookmark, valid: false });
      }
    }

    elements.searchResultStats.textContent = t('search_validation_complete', { valid: validCount, invalid: invalidCount });
    renderValidatedSearchResults(validatedResults, searchQuery);
  }

  function renderValidatedSearchResults(results, query) {
    const textOnly = elements.searchTextOnly.checked;
    elements.searchResults.replaceChildren();
    const fragment = document.createDocumentFragment();

    results.forEach(bm => {
      const pathStr = bm.path.length ? bm.path.join(' / ') : t('path');
      const statusIcon = bm.valid ? '✅' : '❌';
      const statusText = bm.valid ? '有效' : '无效';

      const item = document.createElement('div');
      item.className = 'item';

      const container = document.createElement('div');

      const titleEl = document.createElement('div');
      titleEl.className = 'title';
      titleEl.appendChild(document.createTextNode(`${statusIcon} `));
      titleEl.appendChild(buildHighlightFragment(bm.title, query, textOnly));

      const urlEl = document.createElement('div');
      urlEl.className = 'url';
      const link = document.createElement('a');
      link.href = bm.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.appendChild(buildHighlightFragment(bm.url, query, textOnly));
      urlEl.appendChild(link);

      const metaEl = document.createElement('div');
      metaEl.className = 'meta';
      metaEl.textContent = `${t('path')}：${pathStr} | 状态：${statusText}`;

      container.appendChild(titleEl);
      container.appendChild(urlEl);
      container.appendChild(metaEl);

      item.appendChild(container);
      fragment.appendChild(item);
    });

    elements.searchResults.appendChild(fragment);
  }

  function setupEvents() {
    updateSimilarityLabel();
    elements.similarityThreshold.addEventListener('input', updateSimilarityLabel);

    elements.scanDuplicates.addEventListener('click', scanDuplicateBookmarks);
    elements.refreshDuplicates.addEventListener('click', scanDuplicateBookmarks);
    elements.dupSelectAll.addEventListener('click', () => selectAll('.dup-checkbox'));
    elements.dupDelete.addEventListener('click', deleteSelectedDuplicates);
    if (elements.dupDeleteDirect) {
      elements.dupDeleteDirect.addEventListener('click', deleteSelectedDuplicatesDirect);
    }
    if (elements.dupSmartOldest) {
      elements.dupSmartOldest.addEventListener('click', () => applySmartSelection('oldest'));
    }
    if (elements.dupSmartNewest) {
      elements.dupSmartNewest.addEventListener('click', () => applySmartSelection('newest'));
    }
    if (elements.dupSmartLongestUrl) {
      elements.dupSmartLongestUrl.addEventListener('click', () => applySmartSelection('longestUrl'));
    }
    if (elements.dupSmartApply && elements.dupSmartRule) {
      elements.dupSmartApply.addEventListener('click', () => {
        applySmartSelection(elements.dupSmartRule.value);
      });
    }

    elements.scanDupFolders.addEventListener('click', scanDuplicateFolders);
    elements.refreshDupFolders.addEventListener('click', scanDuplicateFolders);
    elements.dupFolderSelectAll.addEventListener('click', () => selectAll('.dup-folder-checkbox'));
    elements.dupFolderDelete.addEventListener('click', deleteSelectedDuplicateFolders);
    if (elements.dupFolderDeleteDirect) {
      elements.dupFolderDeleteDirect.addEventListener('click', deleteSelectedDuplicateFoldersDirect);
    }

    elements.scanEmptyFolders.addEventListener('click', scanEmptyFolders);
    elements.refreshEmptyFolders.addEventListener('click', scanEmptyFolders);
    elements.emptyFolderSelectAll.addEventListener('click', () => selectAll('.empty-folder-checkbox'));
    elements.emptyFolderDelete.addEventListener('click', deleteSelectedEmptyFolders);
    if (elements.emptyFolderDeleteDirect) {
      elements.emptyFolderDeleteDirect.addEventListener('click', deleteSelectedEmptyFoldersDirect);
    }

    elements.scanBroken.addEventListener('click', scanBrokenBookmarks);
    elements.refreshBroken.addEventListener('click', scanBrokenBookmarks);
    if (elements.refreshBrokenAction) {
      elements.refreshBrokenAction.addEventListener('click', scanBrokenBookmarks);
    }
    elements.brokenSelectAll.addEventListener('click', () => selectAll('.broken-checkbox'));
    elements.brokenDelete.addEventListener('click', deleteSelectedBroken);
    if (elements.brokenDeleteDirect) {
      elements.brokenDeleteDirect.addEventListener('click', deleteSelectedBrokenDirect);
    }
    // 暂停按钮事件
    const brokenPauseBtn = document.getElementById('broken-pause');
    if (brokenPauseBtn) {
      brokenPauseBtn.addEventListener('click', toggleBrokenScanPause);
    }

    elements.archivePreview.addEventListener('click', buildArchivePreview);
    document.querySelectorAll('input[name="archive-mode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'ai' && radio.checked && elements.aiConfigPanel) {
          elements.aiConfigPanel.open = true;
          if (elements.aiStatus && !elements.aiStatus.textContent) {
            const ai = getAiConfig();
            setAiStatus(
              ai.baseUrl && ai.model
                ? 'AI 已配置，可直接生成预览'
                : '请先填写接口地址并拉取模型；留空则使用本地分类',
              'info'
            );
          }
        }
      });
    });
    if (elements.aiTest) {
      elements.aiTest.addEventListener('click', testAiConnection);
    }
    if (elements.aiRefreshModels) {
      elements.aiRefreshModels.addEventListener('click', refreshAiModels);
    }
    if (elements.aiSave) {
      elements.aiSave.addEventListener('click', saveAiConfig);
    }
    if (elements.aiClear) {
      elements.aiClear.addEventListener('click', clearAiConfig);
    }
    if (elements.archiveNaming) {
      elements.archiveNaming.addEventListener('change', () => {
        state.archiveNaming = elements.archiveNaming.value || 'zh';
        const settings = loadSettings();
        settings.archive = { ...(settings.archive || {}), naming: state.archiveNaming };
        saveSettings(settings);
      });
    }
    if (elements.archiveMinGroup) {
      elements.archiveMinGroup.addEventListener('change', () => {
        const settings = loadSettings();
        settings.archive = {
          ...(settings.archive || {}),
          minGroupSize: Math.max(1, Number(elements.archiveMinGroup.value || 2))
        };
        saveSettings(settings);
      });
    }
    elements.archiveSelectAll.addEventListener('click', () => selectAll('.archive-checkbox'));
    elements.archiveRun.addEventListener('click', runArchive);

    elements.refreshFolders.addEventListener('click', buildFolderSelect);
    if (elements.archiveCreateRoot) {
      elements.archiveCreateRoot.addEventListener('click', createArchiveRoot);
    }
    elements.archiveFilter.addEventListener('change', () => {
      state.archiveGroupFilterText = elements.archiveFilter.value;
      renderArchiveResults(state.archiveGroups);
    });
    if (elements.archiveFilterChecks) {
      elements.archiveFilterChecks.addEventListener('change', (event) => {
        const input = event.target.closest('input[type="checkbox"]');
        if (!input) return;
        const name = input.dataset.name;
        if (!name) return;
        if (input.checked) {
          if (!state.archiveGroupSelections.includes(name)) {
            state.archiveGroupSelections.push(name);
          }
        } else {
          state.archiveGroupSelections = state.archiveGroupSelections.filter(item => item !== name);
        }
        rebuildArchiveGroupsFromSelection();
      });
    }
    if (elements.archiveFilterRefresh) {
      elements.archiveFilterRefresh.addEventListener('click', buildArchivePreview);
    }
    if (elements.archiveKeywordFilter) {
      elements.archiveKeywordFilter.addEventListener('input', () => {
        state.archiveKeywordFilter = elements.archiveKeywordFilter.value.trim();
        renderArchiveResults(state.archiveGroups);
      });
    }
    if (elements.archiveApplyFiltered) {
      elements.archiveApplyFiltered.addEventListener('click', applyArchiveBulkTarget);
    }

    if (elements.exportBtn) {
      elements.exportBtn.addEventListener('click', () => handleExport('download'));
    }
    if (elements.exportCopy) {
      elements.exportCopy.addEventListener('click', () => handleExport('copy'));
    }
    if (elements.importRun) {
      elements.importRun.addEventListener('click', handleImport);
    }
    if (elements.importClear) {
      elements.importClear.addEventListener('click', clearImportForm);
    }
    if (elements.importTabs) {
      elements.importTabs.addEventListener('change', updateImportTabOptions);
      updateImportTabOptions();
    }

    if (elements.openSettings) {
      elements.openSettings.addEventListener('click', openSettings);
    }
    if (elements.settingsClose) {
      elements.settingsClose.addEventListener('click', closeSettings);
    }
    if (elements.settingsCancel) {
      elements.settingsCancel.addEventListener('click', closeSettings);
    }
    if (elements.settingsBackdrop) {
      elements.settingsBackdrop.addEventListener('click', closeSettings);
    }
    if (elements.settingSimilarity) {
      elements.settingSimilarity.addEventListener('input', () => {
        elements.settingSimilarityValue.textContent = Number(elements.settingSimilarity.value || 0.8).toFixed(2);
      });
    }
    if (elements.settingsSave) {
      elements.settingsSave.addEventListener('click', () => {
        const settings = collectSettingsFromModal();
        saveSettings(settings);
        applySettingsState(settings);
        closeSettings();
      });
    }

    elements.undoBtn.addEventListener('click', undoLastAction);
    if (elements.snapshotCreate) {
      elements.snapshotCreate.addEventListener('click', createManualSnapshot);
    }
    if (elements.snapshotRefresh) {
      elements.snapshotRefresh.addEventListener('click', renderSnapshotList);
    }
    if (elements.snapshotClear) {
      elements.snapshotClear.addEventListener('click', clearSnapshots);
    }
    if (elements.clearTrashBtn) {
      elements.clearTrashBtn.addEventListener('click', clearTrash);
    }
    elements.refreshBtn.addEventListener('click', () => {
      clearUndo();
      elements.dupResults.textContent = '';
      elements.dupFolderResults.textContent = '';
      elements.emptyFolderResults.textContent = '';
      elements.brokenResults.textContent = '';
      if (elements.brokenProgress) elements.brokenProgress.classList.add('hidden');
      elements.archiveResults.textContent = '';
      elements.dupSmartOldest.disabled = true;
      elements.dupSmartNewest.disabled = true;
      elements.dupSmartLongestUrl.disabled = true;
      if (elements.dupSmartApply) elements.dupSmartApply.disabled = true;
      if (elements.dupDeleteDirect) elements.dupDeleteDirect.disabled = true;
      if (elements.dupFolderDeleteDirect) elements.dupFolderDeleteDirect.disabled = true;
      if (elements.emptyFolderDeleteDirect) elements.emptyFolderDeleteDirect.disabled = true;
      if (elements.brokenDeleteDirect) elements.brokenDeleteDirect.disabled = true;
      if (elements.exportResult) setTransferStatus(elements.exportResult, '', '');
      if (elements.importResult) setTransferStatus(elements.importResult, '', '');
      if (elements.importFile) elements.importFile.value = '';
    });

    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const target = document.getElementById(targetId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    elements.previewClose.addEventListener('click', closePreview);
    elements.previewBackdrop.addEventListener('click', closePreview);
    elements.previewOpenTab.addEventListener('click', () => {
      if (state.currentPreviewUrl) {
        chrome.tabs.create({ url: state.currentPreviewUrl });
      }
    });

    if (elements.scrollTopBtn) {
      elements.scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
    if (elements.scrollBottomBtn) {
      elements.scrollBottomBtn.addEventListener('click', () => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      });
    }

    document.addEventListener('click', (event) => {
      const btn = event.target.closest('.preview-link');
      if (!btn) return;
      const url = btn.dataset.url;
      if (url) {
        openPreview(url);
      }
    });
    document.addEventListener('change', (event) => {
      const brokenSizeSelect = event.target.closest('.broken-page-size');
      if (brokenSizeSelect) {
        const group = brokenSizeSelect.dataset.group;
        const size = Number(brokenSizeSelect.value);
        state.brokenPaging[group] = { page: 1, size };
        renderBrokenResults(state.brokenBookmarks);
        return;
      }
      const sizeSelect = event.target.closest('.archive-page-size');
      if (sizeSelect) {
        const group = sizeSelect.dataset.group;
        const size = Number(sizeSelect.value);
        state.archivePaging[group] = { page: 1, size };
        renderArchiveResults(state.archiveGroups);
        return;
      }
      const targetSelect = event.target.closest('.archive-target');
      if (targetSelect) {
        const id = targetSelect.dataset.id;
        state.archiveItemTargets[id] = targetSelect.value;
        return;
      }
      const filterCheck = event.target.closest('.archive-filter-check');
      if (filterCheck) {
        const name = filterCheck.dataset.name;
        if (filterCheck.checked) {
          if (!state.archiveGroupSelections.includes(name)) {
            state.archiveGroupSelections.push(name);
          }
        } else {
          state.archiveGroupSelections = state.archiveGroupSelections.filter(n => n !== name);
        }
        renderArchiveResults(state.archiveGroups);
      }
    });

    document.addEventListener('click', (event) => {
      const brokenPrevBtn = event.target.closest('.broken-page-prev');
      const brokenNextBtn = event.target.closest('.broken-page-next');
      if (brokenPrevBtn || brokenNextBtn) {
        const btn = brokenPrevBtn || brokenNextBtn;
        const group = btn.dataset.group;
        const paging = state.brokenPaging[group] || { page: 1, size: 20 };
        const totalItems = state.brokenBookmarks.filter(item => item.label === group).length;
        const totalPages = Math.max(1, Math.ceil(totalItems / paging.size));
        if (brokenPrevBtn && paging.page > 1) paging.page -= 1;
        if (brokenNextBtn && paging.page < totalPages) paging.page += 1;
        state.brokenPaging[group] = paging;
        renderBrokenResults(state.brokenBookmarks);
        return;
      }
      const prevBtn = event.target.closest('.archive-page-prev');
      const nextBtn = event.target.closest('.archive-page-next');
      if (prevBtn || nextBtn) {
        const btn = prevBtn || nextBtn;
        const group = btn.dataset.group;
        const paging = state.archivePaging[group] || { page: 1, size: 20 };
        const totalPages = Math.max(1, Math.ceil((state.archiveGroups.find(g => g.name === group)?.items.length || 0) / paging.size));
        if (prevBtn && paging.page > 1) paging.page -= 1;
        if (nextBtn && paging.page < totalPages) paging.page += 1;
        state.archivePaging[group] = paging;
        renderArchiveResults(state.archiveGroups);
      }
    });
    document.querySelectorAll('.collapse-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const target = document.getElementById(targetId);
        if (!target) return;
        target.classList.toggle('collapsed');
        btn.textContent = target.classList.contains('collapsed') ? t('expand') : t('collapse');
      });
    });

    // 书签搜索事件绑定
    if (elements.searchBtn) {
      elements.searchBtn.addEventListener('click', searchBookmarks);
    }
    if (elements.searchInput) {
      elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          searchBookmarks();
        }
      });
    }
    if (elements.validateBtn) {
      elements.validateBtn.addEventListener('click', validateSearchResults);
    }
  }
  async function init() {
    setupEvents();
    const settings = loadSettings();
    applySettingsState(settings);
    applyAiConfigToUi();
    await buildFolderSelect();
    initResultsColumns();
    toggleFloatButtons();
    window.addEventListener('scroll', toggleFloatButtons);
  }

  init();

  function openPreview(url) {
    state.currentPreviewUrl = url;
    elements.previewUrl.textContent = url;
    elements.previewFrame.src = url;
    elements.previewModal.classList.remove('hidden');
  }

  function closePreview() {
    elements.previewFrame.src = 'about:blank';
    elements.previewModal.classList.add('hidden');
    state.currentPreviewUrl = null;
  }

  function toggleFloatButtons() {
    if (!elements.scrollTopBtn || !elements.scrollBottomBtn) return;
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const maxScroll = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    elements.scrollTopBtn.classList.toggle('hidden', scrollTop < 200);
    elements.scrollBottomBtn.classList.toggle('hidden', scrollTop > maxScroll - 200);
  }

  function setResultsColumns(value) {
    const columns = Math.max(1, Math.min(4, Number(value) || 3));
    document.documentElement.style.setProperty('--results-columns', columns);
    if (elements.resultsColumns) {
      elements.resultsColumns.value = String(columns);
    }
    try {
      localStorage.setItem('resultsColumns', String(columns));
    } catch {
      // ignore storage errors
    }
  }

  function initResultsColumns() {
    if (elements.resultsColumns) {
      elements.resultsColumns.addEventListener('change', (e) => {
        setResultsColumns(e.target.value);
        const settings = loadSettings();
        settings.resultsColumns = Number(e.target.value);
        saveSettings(settings);
      });
    }
  }
})();

// 语言和主题切换（在IIFE外部添加）
document.addEventListener('DOMContentLoaded', () => {
  const langZh = document.getElementById('lang-zh');
  const langEn = document.getElementById('lang-en');
  const themeLight = document.getElementById('theme-light');
  const themeDark = document.getElementById('theme-dark');

  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem('appSettings') || '{}');
    } catch { return {}; }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem('appSettings', JSON.stringify(settings));
    } catch { }
  }

  // 语言切换
  if (langZh) {
    langZh.addEventListener('click', () => {
      const settings = getSettings();
      settings.language = 'zh';
      saveSettings(settings);
      location.reload();
    });
  }

  if (langEn) {
    langEn.addEventListener('click', () => {
      const settings = getSettings();
      settings.language = 'en';
      saveSettings(settings);
      location.reload();
    });
  }

  // 主题切换
  if (themeLight) {
    themeLight.addEventListener('click', () => {
      document.documentElement.dataset.theme = 'light';
      const settings = getSettings();
      settings.theme = 'light';
      saveSettings(settings);
      themeLight.classList.add('active');
      if (themeDark) themeDark.classList.remove('active');
    });
  }

  if (themeDark) {
    themeDark.addEventListener('click', () => {
      document.documentElement.dataset.theme = 'dark';
      const settings = getSettings();
      settings.theme = 'dark';
      saveSettings(settings);
      themeDark.classList.add('active');
      if (themeLight) themeLight.classList.remove('active');
    });
  }

  // 初始化按钮状态
  const settings = getSettings();
  if (settings.language === 'en') {
    if (langEn) langEn.classList.add('active');
    if (langZh) langZh.classList.remove('active');
  } else {
    if (langZh) langZh.classList.add('active');
    if (langEn) langEn.classList.remove('active');
  }

  if (settings.theme === 'light') {
    if (themeLight) themeLight.classList.add('active');
    if (themeDark) themeDark.classList.remove('active');
  } else {
    if (themeDark) themeDark.classList.add('active');
    if (themeLight) themeLight.classList.remove('active');
  }
});

// 打赏功能
document.addEventListener('DOMContentLoaded', () => {
  // 获取DOM元素
  const donateHeaderBtn = document.getElementById('donate-header-btn');
  const donateModal = document.getElementById('donate-modal');
  const donateClose = document.getElementById('donate-close');
  const donateBackdrop = donateModal?.querySelector('.donate-backdrop');
  const donateSuccessToast = document.getElementById('donate-success-toast');

  // 打开打赏模态框
  function openDonateModal() {
    if (donateModal) {
      donateModal.classList.remove('hidden');
      // 添加进入动画
      const content = donateModal.querySelector('.donate-content');
      if (content) {
        content.style.animation = 'none';
        content.offsetHeight; // 强制重绘
        content.style.animation = 'modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
      }
    }
  }

  // 关闭打赏模态框
  function closeDonateModal() {
    if (donateModal) {
      donateModal.classList.add('hidden');
    }
  }

  // 显示成功提示
  function showSuccessToast() {
    if (donateSuccessToast) {
      donateSuccessToast.classList.remove('hidden');
      donateSuccessToast.style.animation = 'none';
      donateSuccessToast.offsetHeight;
      donateSuccessToast.style.animation = 'toastPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';

      // 3秒后自动隐藏
      setTimeout(() => {
        donateSuccessToast.classList.add('hidden');
      }, 3000);
    }
  }

  // 绑定顶部导航栏打赏按钮
  if (donateHeaderBtn) {
    donateHeaderBtn.addEventListener('click', openDonateModal);
  }

  // 绑定关闭按钮
  if (donateClose) {
    donateClose.addEventListener('click', closeDonateModal);
  }

  // 绑定背景点击关闭
  if (donateBackdrop) {
    donateBackdrop.addEventListener('click', closeDonateModal);
  }

  // 键盘事件：ESC关闭模态框
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && donateModal && !donateModal.classList.contains('hidden')) {
      closeDonateModal();
    }
  });

  // 点击二维码后显示感谢提示（模拟打赏成功）
  const qrcodeImgs = document.querySelectorAll('.qrcode-img');
  qrcodeImgs.forEach(img => {
    img.addEventListener('click', () => {
      closeDonateModal();
      setTimeout(() => {
        showSuccessToast();
      }, 300);
    });
  });
});

