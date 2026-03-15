import { inject } from "@angular/core"
import { Router } from "@angular/router";
import { AuthService } from "@auth/services/auth.service";

export default (_: any, segments: any) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if( authService.isAuthenticated() ){
        const userAccount = authService.userAccount();
        
        if( userAccount?.isNewAccount ){
            router.navigate(['/change-password']);
        }

        return true
    }
    
    authService.setBeforeRedirect( segments.url );

    router.navigate(['/login']);
    return false;
}