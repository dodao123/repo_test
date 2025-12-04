export interface Todo {
    id?: string;
    title: string;
    description?: string;
    isCompleted: boolean;
    createdAt?: Date;
    userId: string;
}
