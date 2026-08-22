import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data: todos } = await supabase.from('todos').select('*');
  const { data: categories } = await supabase.from('categories').select('*');
  
  return NextResponse.json({
    todos: todos ?? [],
    categories: categories?.length ? categories : [{ id: 'default', name: 'General' }]
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  if (body.type === 'ADD_TODO') {
    await supabase.from('todos').insert([{
      id: Date.now().toString(),
      text: body.text,
      completed: false,
      categoryId: body.categoryId || 'default'
    }]);
  } else if (body.type === 'TOGGLE_TODO') {
    await supabase.from('todos').update({ completed: body.completed }).match({ id: body.id });
  } else if (body.type === 'DELETE_TODO') {
    await supabase.from('todos').delete().match({ id: body.id });
  } else if (body.type === 'ADD_CATEGORY') {
    await supabase.from('categories').insert([{
      id: Date.now().toString(),
      name: body.name
    }]);
  } else if (body.type === 'DELETE_CATEGORY') {
    await supabase.from('categories').delete().match({ id: body.id });
    await supabase.from('todos').update({ categoryId: 'default' }).match({ categoryId: body.id });
  } else if (body.type === 'SET_PRIORITY') {
    await supabase.from('todos').update({ priority: body.priority }).match({ id: body.id });
  } else if (body.type === 'SET_DUE_DATE') {
    await supabase.from('todos').update({ dueDate: body.dueDate }).match({ id: body.id });
  }

  // Fetch updated data to return
  const { data: todos } = await supabase.from('todos').select('*');
  const { data: categories } = await supabase.from('categories').select('*');

  return NextResponse.json({
    todos: todos ?? [],
    categories: categories?.length ? categories : [{ id: 'default', name: 'General' }]
  });
}
