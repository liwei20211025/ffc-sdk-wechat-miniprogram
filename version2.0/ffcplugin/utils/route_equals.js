/**
 * pageview 判断路由是否包含
 * @param {*} events 
 * @param {*} route 
 * @returns 
 */
export const routeEquals = (events, route) => {
    let eventName = "";

    events.forEach((event) => {

        if(event.eventType === 2) {
            if(event.targetUrls.length) {
                let urlConfig = event.targetUrls[0];
        
                if(route.includes(urlConfig.url)) {
                    eventName =  event.eventName;
                }
            }
        }
    })
    
    return eventName;
}