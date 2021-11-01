class UserInfo {
  ffUserName: string = "";
  ffUserEmail: string = "";
  ffUserKeyId: string = "";
  ffUserCustomizedProperties: object[];
}

export class FFCPlugin {
  private defaultRootUri: string = "";
  private secretKey: string = "";
  private sameFlagCallMinimumInterval: number = 50;
  private userInfo: UserInfo = new UserInfo();
  private featureFlags: any[] = [];
  private storageKey: string = "";
  private eventNames: any[] = [];
}