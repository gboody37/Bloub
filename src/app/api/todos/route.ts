import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'todos.json');

export async function GET() {
  try {
    const fileContents = await fs.readFile(dataFilePath, 'utf8');
    const todos = JSON.parse(fileContents);
    return NextResponse.json(todos);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let todos = [];
    try {
      const fileContents = await fs.readFile(dataFilePath, 'utf8');
      todos = JSON.parse(fileContents);
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }

    const newTodo = {
      id: Date.now().toString(),
      text: body.text,
      completed: false,
      createdAt: new Date().toISOString()
    };
    
    todos.push(newTodo);
    await fs.writeFile(dataFilePath, JSON.stringify(todos, null, 2));
    
    return NextResponse.json(newTodo, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add todo' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const fileContents = await fs.readFile(dataFilePath, 'utf8');
    let todos = JSON.parse(fileContents);
    
    const index = todos.findIndex((t: any) => t.id === body.id);
    if (index !== -1) {
      todos[index] = { ...todos[index], ...body };
      await fs.writeFile(dataFilePath, JSON.stringify(todos, null, 2));
      return NextResponse.json(todos[index]);
    }
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    const fileContents = await fs.readFile(dataFilePath, 'utf8');
    let todos = JSON.parse(fileContents);
    
    todos = todos.filter((t: any) => t.id !== id);
    await fs.writeFile(dataFilePath, JSON.stringify(todos, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 });
  }
}
