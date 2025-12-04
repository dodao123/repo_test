import { Router } from 'express';
import { TodoController } from './todo-controller.js';
import { TodoService } from '../application/todo-service.js';
import { SupabaseTodoRepository } from '../infrastructure/supabase-todo-repository.js';
import { authenticateToken } from '../auth/middleware.js';

const router = Router();

const todoRepository = new SupabaseTodoRepository();
const todoService = new TodoService(todoRepository);
const todoController = new TodoController(todoService);

router.post('/', authenticateToken, todoController.create);
router.get('/', authenticateToken, todoController.getAll);
router.put('/:id', authenticateToken, todoController.update);
router.delete('/:id', authenticateToken, todoController.delete);

export default router;
