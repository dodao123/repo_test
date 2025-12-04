import { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { TodoModal } from '../modal/TodoModal';
import './TodoList.css';

interface Todo {
    id: string;
    title: string;
    description?: string;
    isCompleted: boolean;
    createdAt: string;
}

export const TodoList = () => {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTodo, setEditingTodo] = useState<Todo | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTodos = async () => {
        try {
            const response = await fetch(`${API_URL}/api/todos`, {
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                setTodos(data);
            }
        } catch (error) {
            console.error('Error fetching todos:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTodos();
    }, []);

    const handleAddClick = () => {
        setEditingTodo(undefined);
        setIsModalOpen(true);
    };

    const handleEditClick = (todo: Todo) => {
        setEditingTodo(todo);
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;
        try {
            await fetch(`${API_URL}/api/todos/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            setTodos(todos.filter(t => t.id !== id));
        } catch (error) {
            console.error('Error deleting todo:', error);
        }
    };

    const handleToggleComplete = async (todo: Todo) => {
        try {
            const response = await fetch(`${API_URL}/api/todos/${todo.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isCompleted: !todo.isCompleted }),
                credentials: 'include',
            });
            if (response.ok) {
                const updatedTodo = await response.json();
                setTodos(todos.map(t => t.id === updatedTodo.id ? updatedTodo : t));
            }
        } catch (error) {
            console.error('Error updating todo:', error);
        }
    };

    const handleSave = async (todoData: Partial<Todo>) => {
        try {
            let response;
            if (editingTodo) {
                response = await fetch(`${API_URL}/api/todos/${editingTodo.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(todoData),
                    credentials: 'include',
                });
            } else {
                response = await fetch(`${API_URL}/api/todos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(todoData),
                    credentials: 'include',
                });
            }

            if (response.ok) {
                fetchTodos();
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            console.error('Error saving todo:', error);
            throw error;
        }
    };

    return (
        <div className="todo-container">
            <div className="todo-header">
                <h1>✨ My Tasks</h1>
                <button className="add-btn" onClick={handleAddClick}>
                    <span>+</span> Add Task
                </button>
            </div>

            {isLoading ? (
                <div className="loading">Loading tasks...</div>
            ) : (
                <div className="todo-list">
                    {todos.length === 0 ? (
                        <div className="empty-state">
                            📝 No tasks yet. Click "Add Task" to get started!
                        </div>
                    ) : (
                        todos.map(todo => (
                            <div key={todo.id} className={`todo-item ${todo.isCompleted ? 'completed' : ''}`}>
                                <div className="todo-item-inner">
                                    <div className="todo-top">
                                        <div className="todo-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={todo.isCompleted}
                                                onChange={() => handleToggleComplete(todo)}
                                            />
                                        </div>
                                        <div className="todo-content">
                                            <h3>{todo.title}</h3>
                                            {todo.description && <p>{todo.description}</p>}
                                        </div>
                                    </div>
                                    <div className="todo-actions">
                                        <button onClick={() => handleEditClick(todo)} className="edit-btn">
                                            ✏️ Edit
                                        </button>
                                        <button onClick={() => handleDeleteClick(todo.id)} className="delete-btn">
                                            🗑️ Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <TodoModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                todo={editingTodo}
            />
        </div>
    );
};
