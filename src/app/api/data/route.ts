import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Helper to map Postgres lowercase columns to frontend camelCase
const mapTodos = (todos: any[]) => todos.map(t => ({
  ...t,
  categoryId: t.categoryid,
  dueDate: t.duedate,
  isHabit: t.is_habit,
  habitFrequency: t.habit_frequency,
  habitDays: t.habit_days,
  habitCompletedCount: t.habit_completed_count,
  habitStreak: t.habit_streak,
  habitLastCompleted: t.habit_last_completed
}));

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ todos: [], categories: [{ id: 'default', name: 'General' }] }, { status: 401 });
  }

  // --- Dynamic Habits Daily Reset & Streak Checker ---
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const { data: habits } = await supabase.from('todos').select('*').match({ is_habit: true, user_id: user.id });
  if (habits && habits.length > 0) {
    for (const h of habits) {
      let needsUpdate = false;
      const updateData: any = {};
      
      if (h.habit_last_completed !== todayStr) {
        // If last completed is not today, they haven't done it today yet -> Reset count & completion status
        if (h.habit_completed_count !== 0 || h.completed === true) {
          updateData.habit_completed_count = 0;
          updateData.completed = false;
          needsUpdate = true;
        }
        // If last completed is also not yesterday, they missed the habit yesterday -> Break streak
        if (h.habit_last_completed !== yesterdayStr && h.habit_streak > 0) {
          updateData.habit_streak = 0;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await supabase.from('todos').update(updateData).eq('id', h.id);
      }
    }
  }

  const { data: todos } = await supabase.from('todos').select('*').eq('user_id', user.id);
  const { data: categories } = await supabase.from('categories').select('*').eq('user_id', user.id);
  
  return NextResponse.json({
    todos: todos ? mapTodos(todos) : [],
    categories: categories?.length ? categories : [{ id: 'default', name: 'General' }]
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  if (body.type === 'ADD_TODO') {
    await supabase.from('todos').insert([{
      id: Date.now().toString(),
      text: body.text,
      completed: false,
      categoryid: body.categoryId || 'default',
      user_id: user.id,
      is_habit: body.isHabit || false,
      habit_frequency: body.habitFrequency || 1,
      habit_days: body.habitDays || [],
      habit_completed_count: 0,
      habit_streak: 0
    }]);
  } else if (body.type === 'TOGGLE_TODO') {
    await supabase.from('todos').update({ completed: body.completed }).match({ id: body.id, user_id: user.id });
  } else if (body.type === 'INCREMENT_HABIT') {
    const { data: todo } = await supabase.from('todos').select('*').eq('id', body.id).single();
    if (todo && todo.is_habit) {
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (body.newCount === 0 && !body.isCompleted) {
        // Reset habit if clicked while already completed
        await supabase.from('todos').update({
          habit_completed_count: 0,
          completed: false
        }).match({ id: body.id, user_id: user.id });
      } else {
        const newCount = body.newCount;
        const isCompleted = body.isCompleted;
        
        let streak = todo.habit_streak || 0;
        let lastCompleted = todo.habit_last_completed;
        
        if (isCompleted) {
          if (lastCompleted === yesterdayStr) {
            streak += 1;
          } else if (lastCompleted !== todayStr) {
            streak = 1; // Start new streak
          }
          lastCompleted = todayStr;
        }

        await supabase.from('todos').update({
          habit_completed_count: newCount,
          completed: isCompleted,
          habit_streak: streak,
          habit_last_completed: lastCompleted
        }).match({ id: body.id, user_id: user.id });
      }
    }
  } else if (body.type === 'DELETE_TODO') {
    await supabase.from('todos').delete().match({ id: body.id, user_id: user.id });
  } else if (body.type === 'CLEAR_COMPLETED') {
    await supabase.from('todos').delete().match({ completed: true, is_habit: false, user_id: user.id });
  } else if (body.type === 'ADD_CATEGORY') {
    await supabase.from('categories').insert([{
      id: Date.now().toString(),
      name: body.name,
      user_id: user.id
    }]);
  } else if (body.type === 'DELETE_CATEGORY') {
    await supabase.from('categories').delete().match({ id: body.id, user_id: user.id });
    await supabase.from('todos').update({ categoryid: 'default' }).match({ categoryid: body.id, user_id: user.id });
  } else if (body.type === 'UPDATE_CATEGORY') {
    await supabase.from('categories').update({ name: body.name }).match({ id: body.id, user_id: user.id });
  } else if (body.type === 'SET_PRIORITY') {
    await supabase.from('todos').update({ priority: body.priority }).match({ id: body.id, user_id: user.id });
  } else if (body.type === 'SET_DUE_DATE') {
    await supabase.from('todos').update({ duedate: body.dueDate }).match({ id: body.id, user_id: user.id });
  }

  // Fetch updated data to return
  const { data: todos } = await supabase.from('todos').select('*').eq('user_id', user.id);
  const { data: categories } = await supabase.from('categories').select('*').eq('user_id', user.id);

  return NextResponse.json({
    todos: todos ? mapTodos(todos) : [],
    categories: categories?.length ? categories : [{ id: 'default', name: 'General' }]
  });
}
