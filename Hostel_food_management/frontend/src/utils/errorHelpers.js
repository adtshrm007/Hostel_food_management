/**
 * Utility to extract a clean string error message from any API or Axios error.
 * Prevents React "Objects are not valid as a React child" crashes when 422
 * validation detail arrays or objects are returned by FastAPI.
 */
export const extractErrorMessage = (err, fallback = 'An error occurred.') => {
  if (!err) return fallback;
  
  const detail = err?.response?.data?.detail;
  
  if (typeof detail === 'string') {
    return detail;
  }
  
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item?.msg) return `${item.loc ? item.loc.join('.') + ': ' : ''}${item.msg}`;
        return JSON.stringify(item);
      })
      .join('; ');
  }
  
  if (detail && typeof detail === 'object') {
    return detail.msg || JSON.stringify(detail);
  }
  
  return err?.message || fallback;
};

export default extractErrorMessage;
