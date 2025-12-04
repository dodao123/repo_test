import { ITodoRepository } from '../domain/todo-repository.js';
import { Todo } from '../domain/todo.js';

export class TodoService {
    constructor(private todoRepository: ITodoRepository) { }

    async createTodo(title: string, userId: string, description?: string): Promise<Todo> {
        const newTodo: Todo = {
            title,
            description,
            isCompleted: false,
            userId
        };
        return this.todoRepository.create(newTodo);
    }

    async getTodos(userId: string): Promise<Todo[]> {
        return this.todoRepository.findAll(userId);
    }

    async toggleTodoCompletion(id: string, isCompleted: boolean): Promise<Todo | null> {
        return this.todoRepository.update(id, { isCompleted });
    }

    async updateTodo(id: string, title: string, description?: string): Promise<Todo | null> {
        return this.todoRepository.update(id, { title, description });
    }

    async deleteTodo(id: string): Promise<boolean> {
        return this.todoRepository.delete(id);
    }
}
