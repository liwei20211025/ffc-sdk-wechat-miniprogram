/**
 * 获取符合当前事件元素的 eventName
 * @param {事件列表} events 
 * @param {触发元素 ID} id 
 * @param {当前页面路由} route 
 */
export const idRouteEquals = (events, id, route) => {

  let _id = `#${id}`;
  let eventName = "";

  events.forEach((event) => {

    if(event.eventType === 3 && event.elementTargets) {
      let ids = event.elementTargets.split(",");

      if(ids.includes(_id)) {
        if(event.targetUrls.length) {
          let urlConfig = event.targetUrls[0];
  
          if(route.includes(urlConfig.url)) {
            eventName =  event.eventName;
          }
        }
      }
    }
  })

  return eventName;
}