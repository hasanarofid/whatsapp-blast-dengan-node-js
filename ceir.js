const axios = require("axios");
require("dotenv").config();

const API_KEY = process.env.CEIR_API_KEY;
const API_SECRET = process.env.CEIR_API_SECRET;
const BASE_URL = process.env.CEIR_BASE_URL;

/**
 * Call CEIR API
 * @param {string} service - status | history | sf | digi | bc | tipe
 * @param {string} imei - IMEI list separated by comma, space or newline
 * @param {Object} options - optional parameters like start_date, end_date
 */
async function callCeirApi(service, imei, options = {}) {
  try {
    const params = new URLSearchParams();
    params.append("service", service);
    params.append("imei", imei);
    params.append("API_KEY", API_KEY);
    params.append("API_SECRET", API_SECRET);

    if (options.start_date) params.append("start_date", options.start_date);
    if (options.end_date) params.append("end_date", options.end_date);

    const response = await axios.post(BASE_URL, params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return response.data;
  } catch (error) {
    const errorData = error.response ? error.response.data : null;
    console.error('CEIR API Error:', errorData || error.message);
    
    return { 
        status: 'error', 
        error_code: errorData && errorData.error_code ? errorData.error_code : 'CONNECTION_ERROR', 
        message: error.message 
    };
  }
}

module.exports = { callCeirApi };
