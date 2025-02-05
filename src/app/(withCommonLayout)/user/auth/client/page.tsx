

const ClientForm = dynamic(() => import('./ClientForm'));
import dynamic from 'next/dynamic';


export default function Page() {
    return (
        <div>
            <ClientForm/> 
        </div>
    );
}