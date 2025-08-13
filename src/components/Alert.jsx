export function CustomAlert({ title, message, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm text-center">
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-300 mb-4">{message}</p>
        <button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-8 rounded-lg">
          OK
        </button>
      </div>
    </div>
  );
}

export function ConfirmationModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm text-center">
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-300 mb-4">{message}</p>
        <div className="flex gap-4">
          <button onClick={onCancel} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 rounded-lg">Cancel</button>
          <button onClick={onConfirm} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg">Confirm</button>
        </div>
      </div>
    </div>
  );
}


