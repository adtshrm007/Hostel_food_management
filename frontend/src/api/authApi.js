import axiosInstance from './axiosInstance';

export const authApi = {
  registerStudent: async (studentData) => {
    const response = await axiosInstance.post('/auth/student/register', studentData);
    return response.data;
  },

  forgotPasswordStudent: async (data) => {
    const response = await axiosInstance.post('/auth/student/forgot-password', data);
    return response.data;
  },

  loginStudent: async (email, password) => {
    const payload = typeof email === 'object' ? email : { email, password };
    const response = await axiosInstance.post('/auth/student/login', payload);
    return response.data;
  },

  registerAdmin: async (adminData) => {
    const payload = {
      username: typeof adminData?.username === 'string' ? adminData.username.trim() : adminData?.username,
      password: typeof adminData?.password === 'string' ? adminData.password.trim() : adminData?.password,
    };
    const response = await axiosInstance.post('/auth/admin/register', payload);
    return response.data;
  },

  loginAdmin: async (username, password) => {
    const payload = typeof username === 'object'
      ? { username: typeof username.username === 'string' ? username.username.trim() : username.username, password: username.password }
      : { username: typeof username === 'string' ? username.trim() : username, password };
    const response = await axiosInstance.post('/auth/admin/login', payload);
    return response.data;
  },

  logout: async () => {
    const response = await axiosInstance.post('/auth/logout');
    return response.data;
  },

  getMe: async () => {
    const response = await axiosInstance.get('/auth/me');
    return response.data;
  },
};

export default authApi;
