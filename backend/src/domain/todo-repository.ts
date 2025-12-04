import { Todo } from './todo.ts';

export interface ITodoRepository {
    create(todo: Todo): Promise<Todo>;
    findAll(userId: string): Promise<Todo[]>;
    findById(id: string): Promise<Todo | null>;
    update(id: string, todo: Partial<Todo>): Promise<Todo | null>;
    delete(id: string): Promise<boolean>;
}
