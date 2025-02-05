import baseApi from "./baseApi";


const projectApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        // get all api
        sendMessage: build.mutation({
            query: (messageData) => ({
                url: '/messages',
                method: 'POST',
                body: messageData
            }),
            invalidatesTags: ['message'],
        }),
        getMessage: build.query({
            query: ({ user1, user2 }) => ({
                url: `/messages?user1=${user1}&user2=${user2}`,
                method: 'GET'
            }),
            providesTags: ['message'],
        }),
        getuser: build.query({
            query: (userId) => ({
                url: `/auth/get-single-user/${userId}`,
                method: 'GET'
            }),
            providesTags: ['message'],
        }),
        getConversation: build.query({
            query: () => ({
                url: `/messages/get-convirsation-list`,
                method: 'GET'
            }),
            providesTags: ['message'],
        }),
        getSingleMessages: build.query({
            query: ({ id }) => ({
                url: `/messages/get-single-messages/${id}`,
                method: 'GET'
            }),
            providesTags: ['message'],
        }),

    }),
});

export const { useGetMessageQuery, useSendMessageMutation, useGetuserQuery, useGetConversationQuery,useGetSingleMessagesQuery } = projectApi;
