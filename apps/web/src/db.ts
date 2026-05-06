import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export type Project = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export type RecordingSegment = {
  id: string
  projectId: string
  createdAt: string
  durationMs: number
  mimeType: string
  blob: Blob
}

type VerstoryDbSchema = DBSchema & {
  projects: {
    key: string
    value: Project
    indexes: { 'by-updatedAt': string }
  }
  segments: {
    key: string
    value: RecordingSegment
    indexes: { 'by-projectId': string; 'by-createdAt': string }
  }
}

let dbPromise: Promise<IDBPDatabase<VerstoryDbSchema>> | null = null

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<VerstoryDbSchema>('verstory-db', 1, {
      upgrade(db) {
        const projects = db.createObjectStore('projects', { keyPath: 'id' })
        projects.createIndex('by-updatedAt', 'updatedAt')

        const segments = db.createObjectStore('segments', { keyPath: 'id' })
        segments.createIndex('by-projectId', 'projectId')
        segments.createIndex('by-createdAt', 'createdAt')
      },
    })
  }
  return dbPromise
}

export async function listProjects() {
  const db = await getDb()
  const projects = await db.getAll('projects')
  projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return projects
}

export async function putProject(project: Project) {
  const db = await getDb()
  await db.put('projects', project)
}

export async function deleteProject(projectId: string) {
  const db = await getDb()
  const tx = db.transaction(['projects', 'segments'], 'readwrite')
  await tx.objectStore('projects').delete(projectId)

  const idx = tx.objectStore('segments').index('by-projectId')
  let cursor = await idx.openCursor(projectId)
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }

  await tx.done
}

export async function listSegments(projectId: string) {
  const db = await getDb()
  const segments = await db.getAllFromIndex('segments', 'by-projectId', projectId)
  segments.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return segments
}

export async function putSegment(segment: RecordingSegment) {
  const db = await getDb()
  await db.put('segments', segment)
}

export async function deleteSegment(segmentId: string) {
  const db = await getDb()
  await db.delete('segments', segmentId)
}

