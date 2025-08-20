export function logMessage(logger:(...data: any[]) => void, ...data: any[]) {
    logger(...data);
}

export function warnMessage(...data: any[]) {
    logMessage(console.warn, ...data);
}