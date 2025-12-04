import { Request, Response } from 'express';
import { TodoService } from '../application/todo-service.js';
import { AuthRequest } from '../auth/middleware.js';

export class TodoController {
    constructor(private todoService: TodoService) { }

    create = async (req: AuthRequest, res: Response) => {
        try {
            const { title, description } = req.body;
            const userId = req.user?.sub;

            if (!userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            if (!title) {
                return res.status(400).json({ message: 'Title is required' });
            }

            const todo = await this.todoService.createTodo(title, userId, description);
            res.status(201).json(todo);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };

    getAll = async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.user?.sub;
            if (!userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const todos = await this.todoService.getTodos(userId);
            res.json(todos);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };

    update = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { title, description, isCompleted } = req.body;

            let updatedTodo;
            if (isCompleted !== undefined) {
                updatedTodo = await this.todoService.toggleTodoCompletion(id, isCompleted);
            } else {
                updatedTodo = await this.todoService.updateTodo(id, title, description);
            }

            if (!updatedTodo) {
                return res.status(404).json({ message: 'Todo not found' });
            }

            res.json(updatedTodo);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };

    delete = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            await this.todoService.deleteTodo(id);
            res.status(204).send();
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };
}
