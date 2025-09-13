/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useRef, useState } from 'react';
import { UserWarning } from './UserWarning';
import * as todoServise from './api/todos';
import { Todo } from './types/Todo';
import classNames from 'classnames';

type Props = {
  todo: Todo;
  isLoading: boolean;
  onUpdateTodo: (updatedTodo: Todo) => Promise<void>;
  onDeleteTodo: (todoId: number) => void;
};

const enum Filter {
  All = 'All',
  Active = 'Active',
  Completed = 'Completed',
}

const FILTERS = [Filter.All, Filter.Active, Filter.Completed];

const TodoItem: React.FC<Props> = ({
  todo,
  isLoading,
  onUpdateTodo,
  onDeleteTodo,
}) => {
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editing, setEditing] = useState(false);

  const todoTitleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (todoTitleRef.current) {
      todoTitleRef.current.focus();
    }
  }, [editing]);

  async function handleUpdateTodo() {
    setEditing(false);
    const trimmedEditTitle = editTitle.trim();

    try {
      if (trimmedEditTitle === '') {
        onDeleteTodo(todo.id);

        return;
      }

      if (editTitle !== todo.title) {
        await onUpdateTodo({ ...todo, title: trimmedEditTitle });
        setEditing(false);
      }
    } catch (error) {
      setEditing(true);
    }
  }

  async function handleChangeCheckbox(e: React.ChangeEvent<HTMLInputElement>) {
    onUpdateTodo({ ...todo, completed: e.target.checked });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    handleUpdateTodo();
  }

  function handleDeleteTodo() {
    onDeleteTodo(todo.id);
  }

  function handleCancel(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setEditTitle(todo.title);
      setEditing(false);
    }
  }

  return (
    <div
      data-cy="Todo"
      className={classNames('todo item-enter item-enter-active', {
        completed: todo.completed,
      })}
      onDoubleClick={() => setEditing(true)}
    >
      <label className="todo__status-label">
        <input
          data-cy="TodoStatus"
          type="checkbox"
          className="todo__status"
          checked={todo.completed}
          onChange={handleChangeCheckbox}
          disabled={isLoading}
        />
      </label>

      {editing ? (
        <form onSubmit={handleSubmit}>
          <input
            data-cy="TodoTitle"
            type="text"
            className="todo__title-field"
            placeholder="Empty todo will bee deleted"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onBlur={handleUpdateTodo}
            onKeyDown={handleCancel}
            autoFocus
            ref={todoTitleRef}
            disabled={isLoading}
          />
        </form>
      ) : (
        <>
          <span data-cy="TodoTitle" className="todo__title">
            {editTitle}
          </span>

          <button
            type="button"
            className="todo__remove"
            data-cy="TodoDelete"
            onClick={handleDeleteTodo}
            disabled={isLoading}
          >
            ×
          </button>
        </>
      )}

      <div
        data-cy="TodoLoader"
        className={classNames('modal overlay', {
          'is-active': isLoading,
        })}
      >
        <div className="modal-background has-background-white-ter" />
        <div className="loader" />
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeLink, setActiveLink] = useState('All');
  const [loadingTodoIds, setLoadingTodoIds] = useState<number[]>([]);

  const newTodoFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    const timerId = window.setTimeout(() => setErrorMessage(''), 3000);

    return () => window.clearTimeout(timerId);
  }, [errorMessage]);

  useEffect(() => {
    todoServise
      .getTodos()
      .then(setTodos)
      .catch(() => setErrorMessage('Unable to load todos'));
  }, []);

  useEffect(() => {
    if (errorMessage) {
      newTodoFieldRef.current?.focus();
    }
  }, [errorMessage]);

  const filteredTodos = todos.filter(t => {
    if (activeLink === 'All') {
      return true;
    }

    if (activeLink === 'Active') {
      return !t.completed;
    }

    if (activeLink === 'Completed') {
      return t.completed;
    }

    return false;
  });

  function addTodo(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage('');
    const titleTrimmed = title.trim();

    if (titleTrimmed === '') {
      return setErrorMessage('Title should not be empty');
    }

    const tempId = Date.now();
    const newTodo = {
      id: tempId,
      title: titleTrimmed,
      completed: false,
    };

    setTodos(prevTodos => [...prevTodos, newTodo]);
    setLoadingTodoIds(prevIds => [...prevIds, newTodo.id]);

    todoServise
      .createTodo(newTodo)
      .then(todoFromServer => {
        setTodos(currentTodos =>
          currentTodos.map(currentTodo => {
            return currentTodo.id === tempId ? todoFromServer : currentTodo;
          }),
        );
        setTitle('');
      })
      .catch(error => {
        setTodos(currentTodos =>
          currentTodos.filter(currentTodo => currentTodo.id !== tempId),
        );

        setErrorMessage('Unable to add a todo');
        throw error;
      })
      .finally(() => {
        setLoadingTodoIds([]);
      });
  }

  function deleteTodo(todoId: number) {
    setErrorMessage('');
    setLoadingTodoIds(prevIds => [...prevIds, todoId]);

    return todoServise
      .deleteTodo(todoId)
      .then(() =>
        setTodos(currentTodos => currentTodos.filter(t => t.id !== todoId)),
      )
      .catch(error => {
        setErrorMessage('Unable to delete a todo');
        throw error;
      })
      .finally(() => setLoadingTodoIds([]));
  }

  function updateTodo(updatedTodo: Todo) {
    setErrorMessage('');
    setLoadingTodoIds(prevIds => [...prevIds, updatedTodo.id]);

    return todoServise
      .updateTodo(updatedTodo)
      .then(todoFromServer => {
        setTodos((prevTodos: Todo[]) => {
          return prevTodos.map(prevTodo =>
            prevTodo.id === todoFromServer.id ? todoFromServer : prevTodo,
          );
        });
      })
      .catch(error => {
        setErrorMessage('Unable to update todo');
        throw error;
      })
      .finally(() => setLoadingTodoIds([]));
  }

  function handleClearCompleted() {
    for (const todo of todos) {
      if (!todo.completed) {
        continue;
      }

      setLoadingTodoIds(prevIds => [...prevIds, todo.id]);

      todoServise
        .deleteTodo(todo.id)
        .then(() =>
          setTodos(currrentTodos =>
            currrentTodos.filter(currentTodo => !currentTodo.completed),
          ),
        )
        .catch(error => {
          setTodos(todos);
          setErrorMessage('Unable to delete a todo');
          throw error;
        })
        .finally(() => setLoadingTodoIds([]));
    }
  }

  function handleActiveLink(
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    predicate: string,
  ) {
    e.preventDefault();
    setActiveLink(predicate);
  }

  function handleToggleCheckboxes() {
    const isActiveTodo = todos.some(t => !t.completed);
    const toggledTodos = todos.map(t =>
      isActiveTodo ? { ...t, completed: true } : { ...t, completed: false },
    );

    for (const todo of toggledTodos) {
      setLoadingTodoIds(prevIds => [...prevIds, todo.id]);
      todoServise
        .updateTodo(todo)
        .then(() => {
          setTodos(toggledTodos);
        })
        .catch(error => {
          setTodos(todos);
          setErrorMessage('Unable to update a todo');
          throw error;
        })
        .finally(() => setLoadingTodoIds([]));
    }
  }

  if (!todoServise.USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className={classNames('todoapp', { 'has-error': errorMessage })}>
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {/* this button should have `active` class only if all todos are completed */}
          {todos.length > 0 && (
            <button
              type="button"
              className={classNames('todoapp__toggle-all', {
                active: todos.every(t => t.completed),
              })}
              onClick={handleToggleCheckboxes}
              data-cy="ToggleAllButton"
            />
          )}

          {/* Add a todo on form submit */}
          <form onSubmit={addTodo}>
            <input
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
              disabled={loadingTodoIds.length > 0}
              ref={newTodoFieldRef}
            />
          </form>
        </header>

        <section className="todoapp__main" data-cy="TodoList">
          {filteredTodos.map((todo: Todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onUpdateTodo={updatedTodo => updateTodo(updatedTodo)}
              onDeleteTodo={deleteTodo}
              isLoading={loadingTodoIds.some(id => id === todo.id)}
            />
          ))}
        </section>

        {/* Hide the footer if there are no todos */}
        {todos.length > 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {`${todos.filter(t => !t.completed).length} items left`}
            </span>

            {/* Active link should have the 'selected' class */}
            <nav className="filter" data-cy="Filter">
              {FILTERS.map((tetxLink, index) => {
                return (
                  <a
                    key={index}
                    href="#/"
                    className={classNames('filter__link', {
                      selected: activeLink === tetxLink,
                    })}
                    data-cy={`FilterLink${tetxLink}`}
                    onClick={e => handleActiveLink(e, tetxLink)}
                  >
                    {tetxLink}
                  </a>
                );
              })}
            </nav>

            {/* this button should be disabled if there are no completed todos */}
            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={!todos.some(t => t.completed)}
              onClick={handleClearCompleted}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      {/* DON'T use conditional rendering to hide the notification */}
      {/* Add the 'hidden' class to hide the message smoothly */}
      <div
        data-cy="ErrorNotification"
        className={classNames(
          'notification is-danger is-light has-text-weight-normal',
          { hidden: !errorMessage },
        )}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={() => setErrorMessage('')}
        />
        {/* show only one message at a time */}
        {errorMessage}
      </div>
    </div>
  );
};

// import React, { useEffect, useState } from 'react';
// import { UserWarning } from './UserWarning';
// import { getTodos, USER_ID } from './api/todos';
// import { Todo } from './types/Todo';
// export const App: React.FC = () => {
//   if (!USER_ID) {
//     return <UserWarning />;
//   }

//   return (
//     <div className="todoapp">
//       <h1 className="todoapp__title">todos</h1>

//       <div className="todoapp__content">
//         <header className="todoapp__header">
//           {/* this button should have `active` class only if all todos are completed */}
//           <button
//             type="button"
//             className="todoapp__toggle-all active"
//             data-cy="ToggleAllButton"
//           />

//           {/* Add a todo on form submit */}
//           <form>
//             <input
//               data-cy="NewTodoField"
//               type="text"
//               className="todoapp__new-todo"
//               placeholder="What needs to be done?"
//             />
//           </form>
//         </header>

//         <section className="todoapp__main" data-cy="TodoList">
//           {/* This is a completed todo */}
//           <div data-cy="Todo" className="todo completed">
//             <label className="todo__status-label">
//               <input
//                 data-cy="TodoStatus"
//                 type="checkbox"
//                 className="todo__status"
//                 checked
//               />
//             </label>

//             <span data-cy="TodoTitle" className="todo__title">
//               Completed Todo
//             </span>

//             {/* Remove button appears only on hover */}
//             <button type="button" className="todo__remove" data-cy="TodoDelete">
//               ×
//             </button>

//             {/* overlay will cover the todo while it is being deleted or updated */}
//             <div data-cy="TodoLoader" className="modal overlay">
//               <div className="modal-background has-background-white-ter" />
//               <div className="loader" />
//             </div>
//           </div>

//           {/* This todo is an active todo */}
//           <div data-cy="Todo" className="todo">
//             <label className="todo__status-label">
//               <input
//                 data-cy="TodoStatus"
//                 type="checkbox"
//                 className="todo__status"
//               />
//             </label>

//             <span data-cy="TodoTitle" className="todo__title">
//               Not Completed Todo
//             </span>
//             <button type="button" className="todo__remove" data-cy="TodoDelete">
//               ×
//             </button>

//             <div data-cy="TodoLoader" className="modal overlay">
//               <div className="modal-background has-background-white-ter" />
//               <div className="loader" />
//             </div>
//           </div>

//           {/* This todo is being edited */}
//           <div data-cy="Todo" className="todo">
//             <label className="todo__status-label">
//               <input
//                 data-cy="TodoStatus"
//                 type="checkbox"
//                 className="todo__status"
//               />
//             </label>

//             {/* This form is shown instead of the title and remove button */}
//             <form>
//               <input
//                 data-cy="TodoTitleField"
//                 type="text"
//                 className="todo__title-field"
//                 placeholder="Empty todo will be deleted"
//                 value="Todo is being edited now"
//               />
//             </form>

//             <div data-cy="TodoLoader" className="modal overlay">
//               <div className="modal-background has-background-white-ter" />
//               <div className="loader" />
//             </div>
//           </div>

//           {/* This todo is in loadind state */}
//           <div data-cy="Todo" className="todo">
//             <label className="todo__status-label">
//               <input
//                 data-cy="TodoStatus"
//                 type="checkbox"
//                 className="todo__status"
//               />
//             </label>

//             <span data-cy="TodoTitle" className="todo__title">
//               Todo is being saved now
//             </span>

//             <button type="button" className="todo__remove" data-cy="TodoDelete">
//               ×
//             </button>

//             {/* 'is-active' class puts this modal on top of the todo */}
//             <div data-cy="TodoLoader" className="modal overlay is-active">
//               <div className="modal-background has-background-white-ter" />
//               <div className="loader" />
//             </div>
//           </div>
//         </section>

//         {/* Hide the footer if there are no todos */}
//         <footer className="todoapp__footer" data-cy="Footer">
//           <span className="todo-count" data-cy="TodosCounter">
//             3 items left
//           </span>

//           {/* Active link should have the 'selected' class */}
//           <nav className="filter" data-cy="Filter">
//             <a
//               href="#/"
//               className="filter__link selected"
//               data-cy="FilterLinkAll"
//             >
//               All
//             </a>

//             <a
//               href="#/active"
//               className="filter__link"
//               data-cy="FilterLinkActive"
//             >
//               Active
//             </a>

//             <a
//               href="#/completed"
//               className="filter__link"
//               data-cy="FilterLinkCompleted"
//             >
//               Completed
//             </a>
//           </nav>

//           {/* this button should be disabled if there are no completed todos */}
//           <button
//             type="button"
//             className="todoapp__clear-completed"
//             data-cy="ClearCompletedButton"
//           >
//             Clear completed
//           </button>
//         </footer>
//       </div>

//       {/* DON'T use conditional rendering to hide the notification */}
//       {/* Add the 'hidden' class to hide the message smoothly */}
//       <div
//         data-cy="ErrorNotification"
//         className="notification is-danger is-light has-text-weight-normal"
//       >
//         <button data-cy="HideErrorButton" type="button" className="delete" />
//         {/* show only one message at a time */}
//         Unable to load todos
//         <br />
//         Title should not be empty
//         <br />
//         Unable to add a todo
//         <br />
//         Unable to delete a todo
//         <br />
//         Unable to update a todo
//       </div>
//     </div>
//   );
// };
