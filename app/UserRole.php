<?php

namespace App;

enum UserRole: string
{
    case Patient = 'patient';
    case Doctor = 'doctor';
    case Nurse = 'nurse';
    case Admin = 'admin';
}
