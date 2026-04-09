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
  targetViews: number;
  completedViews: number;
  enabled?: boolean;
  videos: { id: string; title: string; youtubeUrl: string }[];
};

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
  const [page, setPage] = useState<'projects' | 'videoStats' | 'config' | 'tasks'>('projects');
  const [email, setEmail] = useState('admin@local.dev');
  const [password, setPassword] = useState('admin123');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectForm, setProjectForm] = useState({
    name: '',
    shortDescription: '',
    youtubeChannel: '',
    targetViews: 100,
  });
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

  useEffect(() => {
    void loadProjects();
  }, [token]);

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
    setProjectForm({
      name: '',
      shortDescription: '',
      youtubeChannel: '',
      targetViews: 100,
    });
    await loadProjects();
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
              placeholder="Канал на YouTube"
              value={projectForm.youtubeChannel}
              onChange={(e) => setProjectForm((s) => ({ ...s, youtubeChannel: e.target.value }))}
              required
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
                  </tr>
                ))}
                {currentTasks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
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
