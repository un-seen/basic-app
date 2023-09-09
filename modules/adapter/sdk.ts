import axios, { AxiosResponse } from 'axios';

// Define the HTTP address you want to call
function getAPIUrl(name: string): string {
  return `http://127.0.0.1:1111/${name}`
}


async function post_upload(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const apiUrl = getAPIUrl('uploadfile');
  const response: AxiosResponse = await axios.post(apiUrl, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
}

async function index_file(): Promise<string> {
  const apiUrl = getAPIUrl('indexfile');
  const response: AxiosResponse = await axios.get(apiUrl)
  return response.data;
}

async function health_check(): Promise<string> {
  const apiUrl = getAPIUrl('healthcheck');
  const response: AxiosResponse = await axios.get(apiUrl)
  return response.data;
}

async function get_file(): Promise<string> {
  const apiUrl = getAPIUrl('getfile');
  const response: AxiosResponse = await axios.get(apiUrl)
  return response.data;
}


// Define a function to make the HTTP request
async function prompt_engineering(prompt: string): Promise<any> {
  const params = {
    "prompt": prompt
  }
  const apiUrl = getAPIUrl('usersays');
  const response: AxiosResponse = await axios.get(apiUrl, {params});
  return response.data
}

async function fetch_catalog(prompt: string): Promise<any> {  
  const params = {
    "prompt": prompt
  }
  const apiUrl = getAPIUrl('fetchcatalog');
  const response: AxiosResponse = await axios.get(apiUrl, {params});
  return response.data
}

export {
  post_upload,
  index_file,
  get_file,
  fetch_catalog,
  health_check,
  prompt_engineering
}