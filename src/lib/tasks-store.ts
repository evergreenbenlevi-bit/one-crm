/**
 * Local JSON file store for tasks.
 * Works without Supabase — reads/writes to data/tasks.json.
 * When NEXT_PUBLIC_SUPABASE_URL is set, the app uses Supabase instead.
 *
 * Uses async I/O to avoid blocking the event loop.
 */

import { readFile, writeFile, access } from "fs/promises";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import type { Task, TaskStatus, TaskPriority, TaskOwner, TaskCategory } from "@/lib/types/tasks";

const DATA_FILE = join(process.cwd(), "data", "tasks.json");

// ── Async I/O (preferred) ──

async function readTasksAsync(): Promise<Task[]> {
  try {
    await access(DATA_FILE);
    const content = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    await writeFile(DATA_FILE, "[]", "utf-8").catch(() => {});
    return [];
  }
}

async function writeTasksAsync(tasks: Task[]): Promise<void> {
  await writeFile(DATA_FILE, JSON.stringify(tasks, null, 2), "utf-8");
}

// ── Sync I/O (fallback for non-async contexts) ──

function readTasksSync(): Task[] {
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, "[]", "utf-8");
    return [];
  }
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeTasksSync(tasks: Task[]) {
  writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2), "utf-8");
}

// ── Public API (async versions) ──

export async function getAllTasksAsync(filters?: {
  status?: TaskStatus;
  priority?: TaskPriority;
  owner?: TaskOwner;
  category?: TaskCategory;
}): Promise<Task[]> {
  let tasks = await readTasksAsync();

  if (filters?.status) tasks = tasks.filter(t => t.status === filters.status);
  if (filters?.priority) tasks = tasks.filter(t => t.priority === filters.priority);
  if (filters?.owner) tasks = tasks.filter(t => t.owner === filters.owner);
  if (filters?.category) tasks = tasks.filter(t => t.category === filters.category);

  return tasks.sort((a, b) => a.position - b.position || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function createTaskAsync(task: Omit<Task, "id" | "created_at" | "updated_at" | "completed_at">): Promise<Task> {
  const tasks = await readTasksAsync();
  const newTask: Task = {
    ...task,
    id: randomUUID(),
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  tasks.unshift(newTask);
  await writeTasksAsync(tasks);
  return newTask;
}

export async function updateTaskAsync(id: string, updates: Partial<Task>): Promise<Task | null> {
  const tasks = await readTasksAsync();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return null;

  if (updates.status === "done" && tasks[idx].status !== "done") {
    updates.completed_at = new Date().toISOString();
  }
  if (updates.status && updates.status !== "done") {
    updates.completed_at = null;
  }

  tasks[idx] = { ...tasks[idx], ...updates, updated_at: new Date().toISOString() };
  await writeTasksAsync(tasks);
  return tasks[idx];
}

export async function deleteTaskAsync(id: string): Promise<boolean> {
  const tasks = await readTasksAsync();
  const filtered = tasks.filter(t => t.id !== id);
  if (filtered.length === tasks.length) return false;
  await writeTasksAsync(filtered);
  return true;
}

export async function bulkCreateTasksAsync(newTasks: Omit<Task, "id" | "created_at" | "updated_at" | "completed_at">[]): Promise<Task[]> {
  const tasks = await readTasksAsync();
  const created: Task[] = newTasks.map(t => ({
    ...t,
    id: randomUUID(),
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  tasks.push(...created);
  await writeTasksAsync(tasks);
  return created;
}

// ── Sync wrappers (backward compat — used by existing imports) ──

export function getAllTasks(filters?: {
  status?: TaskStatus;
  priority?: TaskPriority;
  owner?: TaskOwner;
  category?: TaskCategory;
}): Task[] {
  let tasks = readTasksSync();

  if (filters?.status) tasks = tasks.filter(t => t.status === filters.status);
  if (filters?.priority) tasks = tasks.filter(t => t.priority === filters.priority);
  if (filters?.owner) tasks = tasks.filter(t => t.owner === filters.owner);
  if (filters?.category) tasks = tasks.filter(t => t.category === filters.category);

  return tasks.sort((a, b) => a.position - b.position || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function createTask(task: Omit<Task, "id" | "created_at" | "updated_at" | "completed_at">): Task {
  const tasks = readTasksSync();
  const newTask: Task = {
    ...task,
    id: randomUUID(),
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  tasks.unshift(newTask);
  writeTasksSync(tasks);
  return newTask;
}

export function updateTask(id: string, updates: Partial<Task>): Task | null {
  const tasks = readTasksSync();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return null;

  if (updates.status === "done" && tasks[idx].status !== "done") {
    updates.completed_at = new Date().toISOString();
  }
  if (updates.status && updates.status !== "done") {
    updates.completed_at = null;
  }

  tasks[idx] = { ...tasks[idx], ...updates, updated_at: new Date().toISOString() };
  writeTasksSync(tasks);
  return tasks[idx];
}

export function deleteTask(id: string): boolean {
  const tasks = readTasksSync();
  const filtered = tasks.filter(t => t.id !== id);
  if (filtered.length === tasks.length) return false;
  writeTasksSync(filtered);
  return true;
}

export function bulkCreateTasks(newTasks: Omit<Task, "id" | "created_at" | "updated_at" | "completed_at">[]): Task[] {
  const tasks = readTasksSync();
  const created: Task[] = newTasks.map(t => ({
    ...t,
    id: randomUUID(),
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  tasks.push(...created);
  writeTasksSync(tasks);
  return created;
}

export { isLocalMode } from "@/lib/env";
