

import apiClient from "../api-client";

// TODO: This is an example query
export const getJobs = async (job: any) => {
    const resp = await apiClient.api["jobs"].$get({ query: {}, param: {} });
    const json = await resp.json();

    if ("message" in json) {
        throw new Error(json.message);
    }
    return json;
};

