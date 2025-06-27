<?php

namespace Jasontorres\CloudView\Console\Commands;

use Illuminate\Console\Command;

class ShowCloudviewLogo extends Command
{
    protected $signature = 'cloudview:welcome';
    protected $description = 'Displays a welcome message and the CloudView logo.';

    public function handle()
    {
        $this->info(' ');
        $this->info('#################################################');
        $this->info('#                                               #');
        $this->info('#    ____ _                 _                   #');
        $this->info('#   / ___| | ___  _   _ ___| |_ _   _ ___       #');
        $this->info('#  | |   | |/ _ \\| | | / __| __| | | / __|      #');
        $this->info('#  | |___| | (_) | |_| \\__ \\ |_| |_| \\__ \\      #');
        $this->info('#   \\____|_|\\___/ \\__,_|___/\\__|\\__,_|___/      #');
        $this->info('#                                               #');
        $this->info('#                 CloudView Package             #');
        $this->info('#        Your Laravel Database GUI is Ready!    #');
        $this->info('#                                               #');
        $this->info('#################################################');
        $this->info(' ');
        $this->info('To access the GUI, visit: /cloudview  that is it.');
        $this->info(' ');

        return Command::SUCCESS;
    }
}