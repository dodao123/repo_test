import { ITodoRepository } from '../domain/todo-repository.js';
import { Todo } from '../domain/todo.js';
import supabase from '../database-connection/supabase-connection.js';
import { v5 as uuidv5 } from 'uuid';

// Namespace for generating UUIDs from non-UUID user IDs
// This ensures the same user ID always maps to the same UUID
const USER_ID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export class SupabaseTodoRepository implements ITodoRepository {

    private toUUID(userId: string): string {
        // If it's already a valid UUID, return it
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(userId)) {
            return userId;
        }
        // Otherwise generate a UUID based on the string ID
        return uuidv5(userId, USER_ID_NAMESPACE);
    }

    async create(todo: Todo): Promise<Todo> {
        const userUuid = this.toUUID(todo.userId);

        const { data, error } = await supabase
            .from('todos')
            .insert([{
                title: todo.title,
                description: todo.description,
                is_completed: todo.isCompleted,
                user_id: userUuid
            }])
            .select()
            .single();

        if (error) throw new Error(error.message);

        return this.mapToDomain(data, todo.userId); // Pass original userId back to domain
    }

    async findAll(userId: string): Promise<Todo[]> {
        const userUuid = this.toUUID(userId);

        const { data, error } = await supabase
            .from('todos')
            .select('*')
            .eq('user_id', userUuid)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        return data.map((item: any) => this.mapToDomain(item, userId));
    }

    async findById(id: string): Promise<Todo | null> {
        const { data, error } = await supabase
            .from('todos')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;

        // We don't have the original userId here easily without storing it or passing it
        // But for now we can return the UUID version or we'd need to store the original ID in the DB
        // For this implementation, we'll just return the UUID as the userId since the domain expects a string
        return this.mapToDomain(data, data.user_id);
    }

    async update(id: string, todo: Partial<Todo>): Promise<Todo | null> {
        const updates: any = {};
        if (todo.title !== undefined) updates.title = todo.title;
        if (todo.description !== undefined) updates.description = todo.description;
        if (todo.isCompleted !== undefined) updates.is_completed = todo.isCompleted;

        const { data, error } = await supabase
            .from('todos')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);

        // See note in findById about userId
        return this.mapToDomain(data, data.user_id);
    }

    async delete(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('todos')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
        return true;
    }

    private mapToDomain(data: any, originalUserId: string): Todo {
        return {
            id: data.id,
            title: data.title,
            description: data.description,
            isCompleted: data.is_completed,
            createdAt: new Date(data.created_at),
            userId: originalUserId
        };
    }
}
