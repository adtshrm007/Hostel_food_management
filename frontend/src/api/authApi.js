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
    const response = await axiosInstance.post('/auth/admin/register', adminData);
    return response.data;
  },

  loginAdmin: async (username, password) => {
    const payload = typeof username === 'object' ? username : { username, password };
    const response = await axiosInstance.post('/auth/admin/login', payload);
    return response.data;
  },
};

export default authApi;
