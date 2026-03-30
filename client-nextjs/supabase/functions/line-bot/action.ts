

export const executeProcedure = async (searchData: any, supabase: any, payload: any = {}) => {
    console.log("searchData", searchData)
    console.log("payload", payload)
    const { lineId } = payload;
    switch (searchData.procedure_name) {
        // case "line_get_booking_history":
        //     return await getBookingHistory(searchData.procedure_name, supabase, lineId);

        // case "line_get_member": // 順便擴充你之前的功能
        //     return await callProcedure(searchData.procedure_name, supabase, lineId);

        default:
            return await callProcedure(searchData.procedure_name, supabase, lineId);
    }
}


const callProcedure = async (procedureName: string, supabase: any, lineId: string | null) => {
    const { data, error } = await supabase.rpc(procedureName, {
        luid: lineId
    });

    console.log("callProcedure: ", data)
    console.log("callProcedure: ", error)
    if (error) {
        return "";
    }
    return data;
}