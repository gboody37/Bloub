import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data.json');
const legacyFilePath = path.join(process.cwd(), 'todos.json');

async function getStore() {
  try {
    const fileContents = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(fileContents);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Check legacy
      try {
        const legacy = await fs.readFile(legacyFilePath, 'utf8');
        const legacyTodos = JSON.parse(legacy);
        return {
          categories: [{ id: 'default', name: 'General' }],
          todos: legacyTodos.map((t: any) => ({ ...t, categoryId: 'default' }))
        };
      } catch (e) {
        return { categories: [{ id: 'default', name: 'General' }], todos: [] };
      }
    }
    throw error;
  }
}

export async function GET() {
  try {
    const data = await getStore();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await getStore();

    if (body.type === 'ADD_TODO') {
      data.todos.push({
        id: Date.now().toString(),
        text: body.text,
        completed: false,
        categoryId: body.categoryId || 'default',
        createdAt: new Date().toISOString()
      });
    } else if (body.type === 'TOGGLE_TODO') {
      const index = data.todos.findIndex((t: any) => t.id === body.id);
      if (index !== -1) data.todos[index].completed = body.completed;
    } else if (body.type === 'DELETE_TODO') {
      data.todos = data.todos.filter((t: any) => t.id !== body.id);
    } else if (body.type === 'ADD_CATEGORY') {
      data.categories.push({
        id: Date.now().toString(),
        name: body.name
      });
    } else if (body.type === 'DELETE_CATEGORY') {
      data.categories = data.categories.filter((c: any) => c.id !== body.id);
      // Move orphaned todos to default
      data.todos = data.todos.map((t: any) => t.categoryId === body.id ? { ...t, categoryId: 'default' } : t);
    }

    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2));
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to mutate data' }, { status: 500 });
  }
}
