import { inject } from "@angular/core"
import { AuthService } from "@/auth/services/auth.service";

export const powersGuard = ( ...permisos: string[] ) => {
    const authService = inject(AuthService);

    if( permisos.length < 1 )
        return false;
    
    return authService.canMatch(...permisos)
}

