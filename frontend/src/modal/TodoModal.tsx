import React, { useState, useEffect } from 'react';
import './TodoModal.css';

interface Todo {
    id?: string;
    title: string;
    description?: string;
    isCompleted: boolean;
}

interface TodoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (todo: Partial<Todo>) => Promise<void>;
    todo?: Todo;
}

export const TodoModal: React.FC<TodoModalProps> = ({ isOpen, onClose, onSave, todo }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (todo) {
            setTitle(todo.title);
            setDescription(todo.description || '');
        } else {
            setTitle('');
            setDescription('');
        }
    }, [todo, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await onSave({ ...todo, title, description });
            onClose();
        } catch (error) {
            console.error('Failed to save todo', error);
            alert('Failed to save todo');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>{todo ? 'Edit Task' : 'Add New Task'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="title" id="title">Title</label>
                        <input
                            type="text"
                            id="title"
                            className="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            placeholder="Enter task title"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            className="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter task description"
                            rows={3}
                        />
                    </div>
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="cancel-btn" disabled={isLoading}>
                            Cancel
                        </button>
                        <button type="submit" className="save-btn" disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
