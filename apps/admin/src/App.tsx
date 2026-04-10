import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import './App.css';

/** API base: env wins; dev defaults to localhost; prod build uses same host + port 3000 (typical docker split 8080/3000). */
function getApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:3000';
  }
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:3000`;
  }
  return 'http://localhost:3000';
}

const API_URL = getApiBaseUrl();

type Project = {
  id: string;
  name: string;
  shortDescription: string;
  youtubeChannel: string;
  youtubeChannelName?: string;
  youtubeChannelDescription?: string;
  videoPrefix?: string;
  targetViews: number;
  themeId: string;
  theme?: Theme;
  completedViews: number;
  enabled?: boolean;
  videos: { id: string; title: string; youtubeUrl: string }[];
};

type ProjectFormFields = {
  name: string;
  shortDescription: string;
  youtubeChannel: string;
  targetViews: number;
  themeId: string;
  youtubeChannelName: string;
  youtubeChannelDescription: string;
  videoPrefix: string;
  enabled: boolean;
};

const emptyProjectForm = (): ProjectFormFields => ({
  name: '',
  shortDescription: '',
  youtubeChannel: '',
  targetViews: 100,
  themeId: '',
  youtubeChannelName: '',
  youtubeChannelDescription: '',
  videoPrefix: '',
  enabled: true,
});

function projectToFormFields(p: Project): ProjectFormFields {
  return {
    name: p.name,
    shortDescription: p.shortDescription,
    youtubeChannel: p.youtubeChannel,
    targetViews: p.targetViews,
    themeId: p.themeId,
    youtubeChannelName: p.youtubeChannelName ?? '',
    youtubeChannelDescription: p.youtubeChannelDescription ?? '',
    videoPrefix: p.videoPrefix ?? '',
    enabled: p.enabled !== false,
  };
}

type VideoStat = {
  id: string;
  title: string;
  youtubeUrl: string;
  watchedCount: number;
};

type VideoStatsResponse = {
  project: { id: string; name: string; targetViews: number };
  videos: VideoStat[];
};

type ConfigEntry = {
  id: string;
  key: string;
  value: string;
  description: string | null;
};

type Theme = {
  id: string;
  name: string;
  keywords: string[];
  vkGroup?: string;
  landingUrl?: string;
};

type ThemeEditRow = {
  id: string;
  name: string;
  keywordsText: string;
  vkGroup: string;
  landingUrl: string;
};

type TeamKnowledgeRow = {
  teamIp: string;
  knownThemes: Array<{ id: string; name: string }>;
};

type CurrentTask = {
  taskId: string;
  teamApiKey: string;
  status: 'prepare' | 'process';
  youtubeVideoTitle: string;
  youtubeVideoUrl: string;
  projectName: string;
  updatedAt: string;
};

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [page, setPage] = useState<'projects' | 'videoStats' | 'config' | 'tasks' | 'themes'>(
    'projects',
  );
  const [email, setEmail] = useState('admin@local.dev');
  const [password, setPassword] = useState('admin123');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectForm, setProjectForm] = useState<ProjectFormFields>(emptyProjectForm);
  const [projectEditForm, setProjectEditForm] = useState<ProjectFormFields | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [themeEdits, setThemeEdits] = useState<ThemeEditRow[]>([]);
  const [themeForm, setThemeForm] = useState({
    name: '',
    keywordsText: '',
    vkGroup: '',
    landingUrl: '',
  });
  const [teamKnowledgeRows, setTeamKnowledgeRows] = useState<TeamKnowledgeRow[]>([]);
  const [videoStats, setVideoStats] = useState<VideoStat[]>([]);
  const [statsProjectName, setStatsProjectName] = useState('');
  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [configForm, setConfigForm] = useState({
    key: '',
    value: '',
    description: '',
  });
  const [currentTasks, setCurrentTasks] = useState<CurrentTask[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const loadProjects = async () => {
    if (!token) return;
    const response = await fetch(`${API_URL}/admin/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const data = (await response.json()) as Project[];
    setProjects(data);
    if (!selectedProjectId && data.length > 0) {
      setSelectedProjectId(data[0].id);
    }
  };

  const loadThemes = async () => {
    if (!token) return;
    const response = await fetch(`${API_URL}/admin/themes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const data = (await response.json()) as Theme[];
    setThemes(data);
    setThemeEdits(
      data.map((theme) => ({
        id: theme.id,
        name: theme.name,
        keywordsText: theme.keywords.join(', '),
        vkGroup: theme.vkGroup ?? '',
        landingUrl: theme.landingUrl ?? '',
      })),
    );
  };

  const loadTeamKnowledge = async () => {
    if (!token) return;
    const response = await fetch(`${API_URL}/team/admin/teams/knowledge`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const data = (await response.json()) as TeamKnowledgeRow[];
    setTeamKnowledgeRows(data);
  };

  useEffect(() => {
    void loadProjects();
  }, [token]);

  useEffect(() => {
    void loadThemes();
  }, [token]);

  useEffect(() => {
    if (!selectedProjectId) {
      setProjectEditForm(null);
      return;
    }
    const p = projects.find((x) => x.id === selectedProjectId);
    if (p) {
      setProjectEditForm(projectToFormFields(p));
    }
  }, [selectedProjectId, projects]);

  useEffect(() => {
    const loadVideoStats = async () => {
      if (!token || !selectedProjectId || page !== 'videoStats') {
        return;
      }
      const response = await fetch(`${API_URL}/admin/projects/${selectedProjectId}/video-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        setVideoStats([]);
        setStatsProjectName('');
        return;
      }
      const data = (await response.json()) as VideoStatsResponse;
      setVideoStats(data.videos);
      setStatsProjectName(data.project.name);
    };

    void loadVideoStats();
  }, [token, selectedProjectId, page]);

  useEffect(() => {
    const loadConfigs = async () => {
      if (!token || page !== 'config') {
        return;
      }
      const response = await fetch(`${API_URL}/admin/configs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        setConfigs([]);
        return;
      }
      const data = (await response.json()) as ConfigEntry[];
      setConfigs(data);
    };
    void loadConfigs();
  }, [token, page]);

  useEffect(() => {
    if (page !== 'themes') {
      return;
    }
    void loadThemes();
    void loadTeamKnowledge();
  }, [token, page]);

  useEffect(() => {
    const loadCurrentTasks = async () => {
      if (!token || page !== 'tasks') {
        return;
      }
      const response = await fetch(`${API_URL}/team/admin/tasks/current`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        setCurrentTasks([]);
        return;
      }
      const data = (await response.json()) as CurrentTask[];
      setCurrentTasks(data);
    };
    void loadCurrentTasks();
  }, [token, page]);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      setError('Неверный логин или пароль');
      return;
    }
    const data = (await response.json()) as { accessToken: string };
    setToken(data.accessToken);
    localStorage.setItem('token', data.accessToken);
  };

  const createProject = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    await fetch(`${API_URL}/admin/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(projectForm),
    });
    setProjectForm(emptyProjectForm());
    await loadProjects();
    setSuccessMessage('Проект создан');
  };

  const saveProjectEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !selectedProjectId || !projectEditForm) return;
    await fetch(`${API_URL}/admin/projects/${selectedProjectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(projectEditForm),
    });
    await loadProjects();
    setSuccessMessage('Проект сохранён');
  };

  const toggleProjectEnabled = async (project: Project, enabled: boolean) => {
    if (!token) return;
    await fetch(`${API_URL}/admin/projects/${project.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ enabled }),
    });
    await loadProjects();
    setSuccessMessage(enabled ? `Проект «${project.name}» включён` : `Проект «${project.name}» отключён`);
  };

  const deleteProject = async (project: Project) => {
    if (!token) return;
    if (!confirm(`Удалить проект «${project.name}»? Это действие необратимо.`)) return;
    await fetch(`${API_URL}/admin/projects/${project.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (selectedProjectId === project.id) {
      setSelectedProjectId('');
    }
    await loadProjects();
    setSuccessMessage(`Проект «${project.name}» удалён`);
  };

  const reloadConfigs = async () => {
    if (!token) return;
    const response = await fetch(`${API_URL}/admin/configs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const data = (await response.json()) as ConfigEntry[];
    setConfigs(data);
  };

  const createConfig = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    await fetch(`${API_URL}/admin/configs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(configForm),
    });
    setConfigForm({ key: '', value: '', description: '' });
    await reloadConfigs();
    setSuccessMessage('Переменная добавлена');
  };

  const updateConfig = async (row: ConfigEntry) => {
    if (!token) return;
    await fetch(`${API_URL}/admin/configs/${row.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        key: row.key,
        value: row.value,
        description: row.description ?? '',
      }),
    });
    await reloadConfigs();
    setSuccessMessage(`Сохранено: ${row.key}`);
  };

  const removeConfig = async (id: string) => {
    if (!token) return;
    await fetch(`${API_URL}/admin/configs/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await reloadConfigs();
    setSuccessMessage('Переменная удалена');
  };

  const saveAllConfigs = async () => {
    if (!token) return;
    await Promise.all(
      configs.map((row) =>
        fetch(`${API_URL}/admin/configs/${row.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            key: row.key,
            value: row.value,
            description: row.description ?? '',
          }),
        }),
      ),
    );
    await reloadConfigs();
    setSuccessMessage('Все изменения успешно сохранены');
  };

  const createTheme = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    const keywords = themeForm.keywordsText
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    await fetch(`${API_URL}/admin/themes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: themeForm.name,
        keywords,
        vkGroup: themeForm.vkGroup,
        landingUrl: themeForm.landingUrl,
      }),
    });
    setThemeForm({ name: '', keywordsText: '', vkGroup: '', landingUrl: '' });
    await loadThemes();
    setSuccessMessage('Тематика создана');
  };

  const saveTheme = async (themeId: string) => {
    if (!token) return;
    const row = themeEdits.find((item) => item.id === themeId);
    if (!row) return;
    const keywords = row.keywordsText
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    await fetch(`${API_URL}/admin/themes/${themeId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: row.name,
        keywords,
        vkGroup: row.vkGroup,
        landingUrl: row.landingUrl,
      }),
    });
    await loadThemes();
    setSuccessMessage('Тематика сохранена');
  };

  const removeTeamKnowledge = async (teamIp: string, themeId: string) => {
    if (!token) return;
    await fetch(`${API_URL}/team/admin/teams/knowledge`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ teamIp, themeId }),
    });
    await loadTeamKnowledge();
    setSuccessMessage('Знание тематики удалено');
  };

  const removeCurrentTask = async (taskId: string) => {
    if (!token) return;
    await fetch(`${API_URL}/team/admin/tasks/current/${taskId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const response = await fetch(`${API_URL}/team/admin/tasks/current`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      const data = (await response.json()) as CurrentTask[];
      setCurrentTasks(data);
    }
    setSuccessMessage('Задача удалена');
  };

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(''), 2200);
    return () => clearTimeout(timer);
  }, [successMessage]);

  if (!token) {
    return (
      <main className="page center">
        <form className="card auth" onSubmit={login}>
          <h1>YT Admin</h1>
          <p className="muted">Вход администратора</p>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            type="password"
          />
          {error && <p className="error">{error}</p>}
          <button type="submit">Войти</button>
        </form>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="topbar">
        <h1>YT Admin Panel</h1>
        <div className="topbar-actions">
          <button
            className={page === 'projects' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setPage('projects')}
          >
            Проекты
          </button>
          <button
            className={page === 'videoStats' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setPage('videoStats')}
          >
            Статистика видео
          </button>
          <button
            className={page === 'config' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setPage('config')}
          >
            КОНФИГ
          </button>
          <button
            className={page === 'tasks' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setPage('tasks')}
          >
            ЗАДАЧИ
          </button>
          <button
            className={page === 'themes' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setPage('themes')}
          >
            ТЕМАТИКИ
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              setToken(null);
            }}
          >
            Выйти
          </button>
        </div>
      </header>

      {page === 'projects' ? (
        <section className="grid two-cols">
          <form className="card" onSubmit={createProject}>
            <h2>Новый проект</h2>
            <input
              placeholder="Название проекта"
              value={projectForm.name}
              onChange={(e) => setProjectForm((s) => ({ ...s, name: e.target.value }))}
              required
            />
            <textarea
              placeholder="Краткое описание"
              value={projectForm.shortDescription}
              onChange={(e) =>
                setProjectForm((s) => ({ ...s, shortDescription: e.target.value }))
              }
              required
            />
            <input
              placeholder="Канал YouTube: ссылка, @handle или id (UC…)"
              value={projectForm.youtubeChannel}
              onChange={(e) => setProjectForm((s) => ({ ...s, youtubeChannel: e.target.value }))}
              required
            />
            <p className="field-hint">
              Ниже — необязательно; если пусто, имя канала возьмётся из поля выше.
            </p>
            <input
              placeholder="Название канала (youtubeChannelName)"
              value={projectForm.youtubeChannelName}
              onChange={(e) =>
                setProjectForm((s) => ({ ...s, youtubeChannelName: e.target.value }))
              }
            />
            <textarea
              placeholder="Описание канала (youtubeChannelDescription)"
              value={projectForm.youtubeChannelDescription}
              onChange={(e) =>
                setProjectForm((s) => ({ ...s, youtubeChannelDescription: e.target.value }))
              }
            />
            <input
              placeholder="Префикс видео (videoPrefix)"
              value={projectForm.videoPrefix}
              onChange={(e) =>
                setProjectForm((s) => ({ ...s, videoPrefix: e.target.value }))
              }
            />
            <input
              type="number"
              min={1}
              placeholder="Целевое число просмотров"
              value={projectForm.targetViews}
              onChange={(e) =>
                setProjectForm((s) => ({ ...s, targetViews: Number(e.target.value) }))
              }
              required
            />
            <select
              value={projectForm.themeId}
              onChange={(e) => setProjectForm((s) => ({ ...s, themeId: e.target.value }))}
              required
            >
              <option value="">Выберите тематику</option>
              {themes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
            <label className="form-row-check">
              <input
                type="checkbox"
                checked={projectForm.enabled}
                onChange={(e) =>
                  setProjectForm((s) => ({ ...s, enabled: e.target.checked }))
                }
              />
              Проект включён (участвует в выдаче задач командам)
            </label>
            <button type="submit">Создать проект</button>
          </form>

          <div className="card">
            <h2>Проекты</h2>
            <div className="projects">
              {projects.map((project) => {
                const isOn = project.enabled !== false;
                return (
                  <div
                    key={project.id}
                    className={
                      project.id === selectedProjectId ? 'project-row active' : 'project-row'
                    }
                  >
                    <button
                      type="button"
                      className="project-main"
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <strong>{project.name}</strong>
                      <span>{project.shortDescription}</span>
                      <small>
                        Прогресс: {project.completedViews} / {project.targetViews}
                      </small>
                      <small>Тематика: {project.theme?.name ?? 'Не выбрана'}</small>
                      <small>Видео: {project.videos.length}</small>
                      {!isOn && <small className="badge-off">Отключён</small>}
                    </button>
                    <div className="project-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          void toggleProjectEnabled(project, !isOn);
                        }}
                      >
                        {isOn ? 'Отключить' : 'Включить'}
                      </button>
                      <button
                        type="button"
                        className="danger btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteProject(project);
                        }}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedProjectId && projectEditForm && (
            <form className="card full-width" onSubmit={saveProjectEdit}>
              <h2>Редактировать проект</h2>
              <input
                placeholder="Название проекта"
                value={projectEditForm.name}
                onChange={(e) =>
                  setProjectEditForm((s) => (s ? { ...s, name: e.target.value } : s))
                }
                required
              />
              <textarea
                placeholder="Краткое описание"
                value={projectEditForm.shortDescription}
                onChange={(e) =>
                  setProjectEditForm((s) =>
                    s ? { ...s, shortDescription: e.target.value } : s,
                  )
                }
                required
              />
              <input
                placeholder="Канал YouTube: ссылка, @handle или id (UC…)"
                value={projectEditForm.youtubeChannel}
                onChange={(e) =>
                  setProjectEditForm((s) =>
                    s ? { ...s, youtubeChannel: e.target.value } : s,
                  )
                }
                required
              />
              <input
                placeholder="Название канала (youtubeChannelName)"
                value={projectEditForm.youtubeChannelName}
                onChange={(e) =>
                  setProjectEditForm((s) =>
                    s ? { ...s, youtubeChannelName: e.target.value } : s,
                  )
                }
              />
              <textarea
                placeholder="Описание канала (youtubeChannelDescription)"
                value={projectEditForm.youtubeChannelDescription}
                onChange={(e) =>
                  setProjectEditForm((s) =>
                    s ? { ...s, youtubeChannelDescription: e.target.value } : s,
                  )
                }
              />
              <input
                placeholder="Префикс видео (videoPrefix)"
                value={projectEditForm.videoPrefix}
                onChange={(e) =>
                  setProjectEditForm((s) =>
                    s ? { ...s, videoPrefix: e.target.value } : s,
                  )
                }
              />
              <input
                type="number"
                min={1}
                placeholder="Целевое число просмотров"
                value={projectEditForm.targetViews}
                onChange={(e) =>
                  setProjectEditForm((s) =>
                    s ? { ...s, targetViews: Number(e.target.value) } : s,
                  )
                }
                required
              />
              <select
                value={projectEditForm.themeId}
                onChange={(e) =>
                  setProjectEditForm((s) => (s ? { ...s, themeId: e.target.value } : s))
                }
                required
              >
                <option value="">Выберите тематику</option>
                {themes.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </select>
              <label className="form-row-check">
                <input
                  type="checkbox"
                  checked={projectEditForm.enabled}
                  onChange={(e) =>
                    setProjectEditForm((s) =>
                      s ? { ...s, enabled: e.target.checked } : s,
                    )
                  }
                />
                Проект включён
              </label>
              <button type="submit">Сохранить изменения</button>
            </form>
          )}
        </section>
      ) : page === 'videoStats' ? (
        <section className="grid one-col">
          <div className="card">
            <h2>Просмотры по видео</h2>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              required
            >
              <option value="">Выберите проект</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            {selectedProjectId && (
              <>
                <p className="muted">Проект: {statsProjectName || 'Загрузка...'}</p>
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th>Видео</th>
                      <th>Просмотров</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videoStats.map((video) => (
                      <tr key={video.id}>
                        <td>
                          <a href={video.youtubeUrl} target="_blank" rel="noreferrer">
                            {video.title}
                          </a>
                        </td>
                        <td>{video.watchedCount}</td>
                      </tr>
                    ))}
                    {videoStats.length === 0 && (
                      <tr>
                        <td colSpan={2} className="muted">
                          Пока нет данных
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </section>
      ) : page === 'config' ? (
        <section className="grid one-col">
          <form className="card" onSubmit={createConfig}>
            <h2>Добавить переменную</h2>
            <input
              placeholder="KEY"
              value={configForm.key}
              onChange={(e) => setConfigForm((s) => ({ ...s, key: e.target.value }))}
              required
            />
            <textarea
              placeholder="VALUE"
              value={configForm.value}
              onChange={(e) => setConfigForm((s) => ({ ...s, value: e.target.value }))}
              required
            />
            <input
              placeholder="Описание"
              value={configForm.description}
              onChange={(e) => setConfigForm((s) => ({ ...s, description: e.target.value }))}
              required
            />
            <button type="submit">Добавить</button>
          </form>

          <div className="card">
            <h2>Список переменных</h2>
            <button type="button" onClick={saveAllConfigs}>
              Сохранить все
            </button>
            <table className="stats-table">
              <thead>
                <tr>
                  <th>KEY</th>
                  <th>VALUE</th>
                  <th>Описание</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <input
                        value={row.key}
                        onChange={(e) =>
                          setConfigs((prev) =>
                            prev.map((item) =>
                              item.id === row.id ? { ...item, key: e.target.value } : item,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <textarea
                        value={row.value}
                        onChange={(e) =>
                          setConfigs((prev) =>
                            prev.map((item) =>
                              item.id === row.id ? { ...item, value: e.target.value } : item,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        value={row.description ?? ''}
                        onChange={(e) =>
                          setConfigs((prev) =>
                            prev.map((item) =>
                              item.id === row.id
                                ? { ...item, description: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className="actions">
                      <button type="button" onClick={() => updateConfig(row)}>
                        Сохранить
                      </button>
                      <button type="button" className="danger" onClick={() => removeConfig(row.id)}>
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : page === 'themes' ? (
        <section className="grid two-cols">
          <form className="card" onSubmit={createTheme}>
            <h2>Новая тематика</h2>
            <input
              placeholder="Название тематики"
              value={themeForm.name}
              onChange={(e) => setThemeForm((s) => ({ ...s, name: e.target.value }))}
              required
            />
            <textarea
              placeholder="Ключевые слова через запятую"
              value={themeForm.keywordsText}
              onChange={(e) => setThemeForm((s) => ({ ...s, keywordsText: e.target.value }))}
            />
            <input
              placeholder="VK группа (опционально)"
              value={themeForm.vkGroup}
              onChange={(e) => setThemeForm((s) => ({ ...s, vkGroup: e.target.value }))}
            />
            <input
              placeholder="Landing URL (опционально)"
              value={themeForm.landingUrl}
              onChange={(e) => setThemeForm((s) => ({ ...s, landingUrl: e.target.value }))}
            />
            <button type="submit">Создать тематику</button>
          </form>
          <div className="card">
            <h2>Тематики</h2>
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Ключевые слова</th>
                  <th>VK группа</th>
                  <th>Landing URL</th>
                </tr>
              </thead>
              <tbody>
                {themes.map((theme) => (
                  <tr key={theme.id}>
                    <td>
                      <input
                        value={themeEdits.find((row) => row.id === theme.id)?.name ?? theme.name}
                        onChange={(e) =>
                          setThemeEdits((prev) =>
                            prev.map((row) =>
                              row.id === theme.id ? { ...row, name: e.target.value } : row,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <textarea
                        value={
                          themeEdits.find((row) => row.id === theme.id)?.keywordsText ??
                          theme.keywords.join(', ')
                        }
                        onChange={(e) =>
                          setThemeEdits((prev) =>
                            prev.map((row) =>
                              row.id === theme.id
                                ? { ...row, keywordsText: e.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                      <div className="actions">
                        <button type="button" onClick={() => saveTheme(theme.id)}>
                          Сохранить
                        </button>
                      </div>
                    </td>
                    <td>
                      <input
                        value={themeEdits.find((row) => row.id === theme.id)?.vkGroup ?? ''}
                        onChange={(e) =>
                          setThemeEdits((prev) =>
                            prev.map((row) =>
                              row.id === theme.id ? { ...row, vkGroup: e.target.value } : row,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        value={themeEdits.find((row) => row.id === theme.id)?.landingUrl ?? ''}
                        onChange={(e) =>
                          setThemeEdits((prev) =>
                            prev.map((row) =>
                              row.id === theme.id ? { ...row, landingUrl: e.target.value } : row,
                            ),
                          )
                        }
                      />
                    </td>
                  </tr>
                ))}
                {themes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted">
                      Тематики пока не созданы
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="card full-width">
            <h2>Команды (IP) и изученные тематики</h2>
            <table className="stats-table">
              <thead>
                <tr>
                  <th>IP команды</th>
                  <th>Изученные тематики</th>
                </tr>
              </thead>
              <tbody>
                {teamKnowledgeRows.map((row) => (
                  <tr key={row.teamIp}>
                    <td>{row.teamIp}</td>
                    <td>
                      {row.knownThemes.length === 0
                        ? '—'
                        : row.knownThemes.map((theme) => (
                            <span key={theme.id} className="inline-chip">
                              {theme.name}
                              <button
                                type="button"
                                className="chip-remove"
                                onClick={() => removeTeamKnowledge(row.teamIp, theme.id)}
                              >
                                x
                              </button>
                            </span>
                          ))}
                    </td>
                  </tr>
                ))}
                {teamKnowledgeRows.length === 0 && (
                  <tr>
                    <td colSpan={2} className="muted">
                      Команды пока не зарегистрированы
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="grid one-col">
          <div className="card">
            <h2>Текущие задачи (prepare / process)</h2>
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Команда</th>
                  <th>Статус</th>
                  <th>Проект</th>
                  <th>Видео</th>
                  <th>Обновлено</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {currentTasks.map((task) => (
                  <tr key={task.taskId}>
                    <td>{task.taskId}</td>
                    <td>{task.teamApiKey}</td>
                    <td>{task.status}</td>
                    <td>{task.projectName}</td>
                    <td>
                      <a href={task.youtubeVideoUrl} target="_blank" rel="noreferrer">
                        {task.youtubeVideoTitle || task.youtubeVideoUrl}
                      </a>
                    </td>
                    <td>{new Date(task.updatedAt).toLocaleString()}</td>
                    <td className="actions">
                      <button
                        type="button"
                        className="danger"
                        onClick={() => removeCurrentTask(task.taskId)}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
                {currentTasks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="muted">
                      Нет задач в статусах prepare/process
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {successMessage && <div className="toast-success">{successMessage}</div>}
    </main>
  );
}

export default App;
