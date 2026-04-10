export const DEFAULT_CONFIGS: Array<{
  key: string;
  value: string;
  description: string;
}> = [
  { key: 'TARGET_URL', value: 'https://www.youtube.com', description: 'Start page URL' },
  { key: 'INPUT_SELECTOR', value: 'input[name="search_query"]', description: 'Input selector' },
  {
    key: 'TEXT',
    value: 'How to kill boss calamitas terraria master mode',
    description: 'Stage1 search query',
  },
  { key: 'STAGE', value: 'both', description: 'Allowed: stage1 | stage2 | both' },
  { key: 'HEADLESS', value: 'false', description: 'Headless browser mode' },
  { key: 'PLAYWRIGHT_CDP_URL', value: '', description: 'CDP URL for browser attach' },
  { key: 'PLAYWRIGHT_USER_DATA_DIR', value: '', description: 'Persistent browser profile path' },
  { key: 'PLAYWRIGHT_BROWSER_CHANNEL', value: 'chrome', description: 'Browser channel' },
  {
    key: 'SKIP_PLAYWRIGHT_BROWSER_INSTALL',
    value: 'false',
    description: 'Skip playwright browser install',
  },
  { key: 'USE_SYSTEM_MOUSE', value: 'true', description: 'Use system mouse' },
  { key: 'MOUSE_SPEED', value: '320', description: 'Base system mouse speed' },
  {
    key: 'MOUSE_SMOOTH_SPEED_MULTIPLIER',
    value: '0.72',
    description: 'Mouse smooth speed multiplier',
  },
  { key: 'MOUSE_OFFSET_X', value: '0', description: 'Mouse calibration offset X' },
  { key: 'MOUSE_OFFSET_Y', value: '0', description: 'Mouse calibration offset Y' },
  { key: 'CLICK_VIEWPORT_TOP_SAFE_PX', value: '88', description: 'Top safe area for clicks' },
  { key: 'MOUSE_OVERSHOOT_THRESHOLD', value: '500', description: 'Overshoot threshold' },
  { key: 'MOUSE_OVERSHOOT_RADIUS', value: '120', description: 'Overshoot radius' },
  { key: 'MOUSE_OVERSHOOT_SPREAD', value: '10', description: 'Overshoot spread' },
  {
    key: 'STAGE2_MOUSE_SPEED_MULTIPLIER',
    value: '0.55',
    description: 'Stage2 mouse speed multiplier',
  },
  { key: 'USE_SYSTEM_KEYBOARD', value: 'true', description: 'Use system keyboard' },
  { key: 'TYPO_MAX_PERCENT', value: '5', description: 'Maximum typo percent' },
  { key: 'TYPING_DELAY_MULTIPLIER', value: '1', description: 'Typing delay multiplier' },
  { key: 'USE_SYSTEM_SCROLL', value: 'true', description: 'Use system scroll' },
  { key: 'SCROLL_CYCLES_MIN', value: '1', description: 'Minimum scroll cycles' },
  { key: 'SCROLL_CYCLES_MAX', value: '20', description: 'Maximum scroll cycles' },
  {
    key: 'YT_SUGGESTION_OPTION_SELECTOR',
    value: '',
    description: 'Optional YouTube suggestion selector',
  },
  { key: 'VIDEO_TITLE_SELECTOR', value: 'a#video-title', description: 'Video title selector' },
  { key: 'VIDEO_END_MIN_RATIO', value: '0.1', description: 'Partial watch min ratio' },
  { key: 'VIDEO_END_MAX_RATIO', value: '0.2', description: 'Partial watch max ratio' },
  { key: 'VIDEO_NEAR_END_TIMEOUT_MS', value: '0', description: 'Near end timeout ms' },
  {
    key: 'VIDEO_PROGRESS_INTERVAL_MS',
    value: '2500',
    description: 'Watch progress interval ms',
  },
  { key: 'VIDEO_WATCH_ERROR_RETRY_MAX', value: '2', description: 'Watch error retry max' },
  {
    key: 'VIDEO_WATCH_ERROR_COOLDOWN_MS',
    value: '0',
    description: 'Watch error cooldown ms',
  },
  { key: 'CHANNEL_TARGET_NAME', value: 'Some channel name', description: 'Stage2 channel name' },
  {
    key: 'CHANNEL_TARGET_HREF',
    value: 'https://www.youtube.com/@channel',
    description: 'Stage2 target channel href',
  },
  {
    key: 'CHANNEL_FIND_TIMEOUT_MS_MIN',
    value: '10000',
    description: 'Channel find timeout min',
  },
  {
    key: 'CHANNEL_FIND_TIMEOUT_MS_MAX',
    value: '20000',
    description: 'Channel find timeout max',
  },
  {
    key: 'VIDEO_TARGET_HREF',
    value: 'https://www.youtube.com/watch?v=XXXXXXXXXXX',
    description: 'Stage2 target video href',
  },
  { key: 'VIDEO_FIND_TIMEOUT_MS_MIN', value: '15000', description: 'Video find timeout min' },
  { key: 'VIDEO_FIND_TIMEOUT_MS_MAX', value: '20000', description: 'Video find timeout max' },
  {
    key: 'STRATEGIES',
    value: 'classicStrategy,vkStrategy',
    description: 'Stage2 strategies list (comma separated)',
  },
  {
    key: 'DEFAULT_STRATEGY',
    value: 'classicStrategy',
    description: 'Fallback strategy if not selected',
  },
  {
    key: 'VK_STRATEGY_FLOW',
    value:
      'open vkGroup; scroll down; hover random elements; find any link; set href to youtubeVideoUrl; click; continue normal watch flow',
    description: 'Human-readable vkStrategy flow for nutjs runner',
  },
  { key: 'POST_LOAD_MS_MIN', value: '1000', description: 'Post-load delay min' },
  { key: 'POST_LOAD_MS_MAX', value: '3000', description: 'Post-load delay max' },
];
